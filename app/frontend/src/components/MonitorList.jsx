import MonitorCard from "./MonitorCard.jsx";
import styles from "../styles/MonitorList.module.css";

export default function MonitorList({ monitors, loading, error, onSelect }) {
  if (loading) {
    return (
      <div className={styles.statusBox}>
        <div className={styles.spinner} />
        <p>Loading monitors…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.statusBox} ${styles.error}`}>
        <p className={styles.errorIcon}>⚠</p>
        <p>Failed to load monitors: {error}</p>
        <p className={styles.hint}>Retrying on next poll cycle</p>
      </div>
    );
  }

  if (monitors.length === 0) {
    return (
      <div className={styles.statusBox}>
        <p className={styles.emptyIcon}>📡</p>
        <p>No monitors yet — add one above</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {monitors.map((m) => (
        <MonitorCard key={m.id} monitor={m} onClick={() => onSelect(m.id)} />
      ))}
    </div>
  );
}
