import { useState, useEffect } from "react";
import IncidentList from "./IncidentList.jsx";
import styles from "../styles/MonitorDetail.module.css";

function formatTime(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString();
}

export default function MonitorDetail({ monitorId, onBack }) {
  const [monitor, setMonitor] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [monitorRes, incidentsRes] = await Promise.all([
          fetch(`/urls/${monitorId}`),
          fetch(`/urls/${monitorId}/incidents`),
        ]);
        if (!monitorRes.ok) throw new Error(`HTTP ${monitorRes.status}`);
        const monitorData = await monitorRes.json();
        const incidentsData = incidentsRes.ok ? await incidentsRes.json() : [];
        if (!cancelled) {
          setMonitor(monitorData);
          setIncidents(incidentsData);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [monitorId]);

  if (loading) {
    return (
      <div className={styles.loadingBox}>
        <div className={styles.spinner} />
        <p>Loading monitor details…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorBox}>
        <p className={styles.errorIcon}>⚠</p>
        <p>Failed to load monitor: {error}</p>
        <button className={styles.backButton} onClick={onBack}>
          ← Back to monitors
        </button>
      </div>
    );
  }

  if (!monitor) return null;

  return (
    <div className={styles.detail}>
      <button className={styles.backButton} onClick={onBack}>
        ← Back to monitors
      </button>

      <div className={styles.hero}>
        <h2 className={styles.name}>{monitor.name}</h2>
        <p className={styles.url}>{monitor.url}</p>
        <p className={styles.created}>
          Added {formatTime(monitor.created_at)}
        </p>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Recent Checks</h3>
        {monitor.recentChecks && monitor.recentChecks.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Code</th>
                  <th>Response</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {monitor.recentChecks.map((check, i) => (
                  <tr key={i}>
                    <td>
                      <span
                        className={`${styles.statusDot} ${
                          check.is_up ? styles.up : styles.down
                        }`}
                      />
                      {check.is_up ? "up" : "down"}
                    </td>
                    <td className={styles.mono}>
                      {check.status_code ?? "—"}
                    </td>
                    <td className={styles.mono}>
                      {check.response_time_ms != null
                        ? `${check.response_time_ms}ms`
                        : "—"}
                    </td>
                    <td className={styles.mono}>
                      {formatTime(check.checked_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.empty}>No checks recorded yet</p>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Incident History</h3>
        <IncidentList incidents={incidents} />
      </section>
    </div>
  );
}
