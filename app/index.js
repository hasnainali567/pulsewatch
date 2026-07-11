const express = require("express");
const { Pool } = require("pg");
const os = require("os");

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false },
});

const CHECK_INTERVAL_MS = 60 * 1000; // background worker runs every 60s

// ---------- Schema (idempotent - safe to run on every boot) ----------
async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS monitored_urls (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS checks (
      id SERIAL PRIMARY KEY,
      url_id INT REFERENCES monitored_urls(id) ON DELETE CASCADE,
      status_code INT,
      response_time_ms INT,
      is_up BOOLEAN NOT NULL,
      checked_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS incidents (
      id SERIAL PRIMARY KEY,
      url_id INT REFERENCES monitored_urls(id) ON DELETE CASCADE,
      started_at TIMESTAMP NOT NULL,
      ended_at TIMESTAMP,
      resolved BOOLEAN DEFAULT FALSE
    );
  `);
}

// ---------- Background worker: check every monitored URL ----------
async function checkUrl(monitor) {
  const start = Date.now();
  let statusCode = null;
  let isUp = false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(monitor.url, { signal: controller.signal });
    clearTimeout(timeout);
    statusCode = res.status;
    isUp = res.status >= 200 && res.status < 400;
  } catch (err) {
    isUp = false;
  }

  const responseTimeMs = Date.now() - start;

  await pool.query(
    `INSERT INTO checks (url_id, status_code, response_time_ms, is_up)
     VALUES ($1, $2, $3, $4);`,
    [monitor.id, statusCode, responseTimeMs, isUp],
  );

  // Find the most recent open incident for this URL, if any
  const openIncident = await pool.query(
    `SELECT * FROM incidents WHERE url_id = $1 AND resolved = FALSE
     ORDER BY started_at DESC LIMIT 1;`,
    [monitor.id],
  );

  if (!isUp && openIncident.rows.length === 0) {
    // Was up, now down -> open a new incident
    await pool.query(
      `INSERT INTO incidents (url_id, started_at, resolved) VALUES ($1, NOW(), FALSE);`,
      [monitor.id],
    );
    console.log(`[incident] ${monitor.name} went DOWN`);
  } else if (isUp && openIncident.rows.length > 0) {
    // Was down, now up -> close the incident
    await pool.query(
      `UPDATE incidents SET ended_at = NOW(), resolved = TRUE WHERE id = $1;`,
      [openIncident.rows[0].id],
    );
    console.log(`[incident] ${monitor.name} recovered`);
  }
}

async function runChecks() {
  try {
    const { rows: monitors } = await pool.query(
      "SELECT * FROM monitored_urls;",
    );
    await Promise.all(monitors.map(checkUrl));
  } catch (err) {
    console.error("Error running checks:", err.message);
  }
}

// ---------- Routes ----------
app.get("/health", (req, res) => res.status(200).send("OK"));

app.get("/", (req, res) => {
  res.json({
    message: "PulseWatch - uptime monitor",
    hostname: os.hostname(),
  });
});

// Add a URL to monitor
app.post("/urls", async (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: "name and url are required" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO monitored_urls (name, url) VALUES ($1, $2) RETURNING id, name, url, created_at;`,
      [name, url],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List all monitored URLs with current status + uptime %
app.get("/urls", async (req, res) => {
  try {
    const { rows: monitors } = await pool.query(
      "SELECT * FROM monitored_urls ORDER BY created_at;",
    );

    const results = await Promise.all(
      monitors.map(async (m) => {
        const latestCheck = await pool.query(
          `SELECT is_up, checked_at FROM checks WHERE url_id = $1
           ORDER BY checked_at DESC LIMIT 1;`,
          [m.id],
        );

        const uptimeStats = await pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE is_up = TRUE) AS up_count,
             COUNT(*) AS total_count
           FROM checks
           WHERE url_id = $1 AND checked_at > NOW() - INTERVAL '24 hours';`,
          [m.id],
        );

        const { up_count, total_count } = uptimeStats.rows[0];
        const uptimePercent =
          total_count > 0 ? ((up_count / total_count) * 100).toFixed(2) : null;

        return {
          id: m.id,
          name: m.name,
          url: m.url,
          currentStatus: latestCheck.rows[0]
            ? latestCheck.rows[0].is_up
              ? "up"
              : "down"
            : "unknown",
          lastCheckedAt: latestCheck.rows[0]?.checked_at || null,
          uptimePercent24h: uptimePercent,
        };
      }),
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get one monitor's detail + recent checks
app.get("/urls/:id", async (req, res) => {
  try {
    const monitor = await pool.query(
      "SELECT * FROM monitored_urls WHERE id = $1;",
      [req.params.id],
    );
    if (monitor.rows.length === 0) {
      return res.status(404).json({ error: "Monitor not found" });
    }
    const checks = await pool.query(
      `SELECT status_code, response_time_ms, is_up, checked_at FROM checks
       WHERE url_id = $1 ORDER BY checked_at DESC LIMIT 20;`,
      [req.params.id],
    );
    res.json({ ...monitor.rows[0], recentChecks: checks.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Incident history for a monitor
app.get("/urls/:id/incidents", async (req, res) => {
  try {
    const incidents = await pool.query(
      `SELECT id, started_at, ended_at, resolved FROM incidents
       WHERE url_id = $1 ORDER BY started_at DESC;`,
      [req.params.id],
    );
    res.json(incidents.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Startup ----------
const PORT = process.env.PORT || 3000;

ensureSchema()
  .then(() => {
    console.log("Schema ready");
    app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
    setInterval(runChecks, CHECK_INTERVAL_MS);
    runChecks(); // run once immediately on boot
  })
  .catch((err) => {
    console.error("Failed to initialize schema:", err.message);
    process.exit(1);
  });
