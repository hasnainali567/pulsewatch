import { useState, useEffect, useCallback, useRef } from "react";
import AddMonitorForm from "./components/AddMonitorForm.jsx";
import MonitorList from "./components/MonitorList.jsx";
import MonitorDetail from "./components/MonitorDetail.jsx";
import styles from "./styles/App.module.css";

const POLL_INTERVAL_MS = 15_000;

export default function App() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const intervalRef = useRef(null);

  // ── Fetch monitors list ──
  const fetchMonitors = useCallback(async () => {
    try {
      const res = await fetch("/urls");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMonitors(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Polling logic — only poll on list view ──
  useEffect(() => {
    fetchMonitors();

    if (selectedId !== null) {
      // In detail view — clear any running interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // List view — start polling
    intervalRef.current = setInterval(fetchMonitors, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [selectedId, fetchMonitors]);

  // ── Handlers ──
  const handleAdd = useCallback(
    async (name, url) => {
      const res = await fetch("/urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      await fetchMonitors();
    },
    [fetchMonitors]
  );

  const handleSelect = useCallback((id) => {
    setSelectedId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBack = useCallback(() => {
    setSelectedId(null);
  }, []);

  // ── Render ──
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.pulse} aria-hidden="true" />
          <h1 className={styles.title}>PulseWatch Demo</h1>
        </div>
        <p className={styles.subtitle}>uptime monitoring dashboard</p>
      </header>

      <main className={styles.main}>
        {selectedId === null ? (
          <>
            <AddMonitorForm onAdd={handleAdd} />
            <MonitorList
              monitors={monitors}
              loading={loading}
              error={error}
              onSelect={handleSelect}
            />
          </>
        ) : (
          <MonitorDetail monitorId={selectedId} onBack={handleBack} />
        )}
      </main>

      <footer className={styles.footer}>
        <span>PulseWatch &copy; {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
