const express = require("express");
const { Client } = require("pg");
const os = require("os");

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/", async (req, res) => {
  let dbStatus = "not checked";
  try {
    const client = new Client({
      host: process.env.DB_HOST,
      port: 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionTimeoutMillis: 5000,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    dbStatus = "connected";
  } catch (err) {
    dbStatus = "error: " + err.message;
  }
  res.json({
    message: "PulseWatch app is running on EC2",
    hostname: os.hostname(),
    database: dbStatus,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
