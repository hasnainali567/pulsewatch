import styles from "../styles/MonitorCard.module.css";

function formatRelativeTime(isoString) {
  if (!isoString) return "never";
  const diff = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function MonitorCard({ monitor, onClick }) {
  const { name, url, currentStatus, lastCheckedAt, uptimePercent24h } = monitor;

  return (
    <button className={styles.card} onClick={onClick} type="button">
      <div className={styles.cardHeader}>
        <span className={styles.name}>{name}</span>
        <span className={`${styles.badge} ${styles[currentStatus]}`}>
          <span className={`${styles.dot} ${styles[`dot${currentStatus}`]}`} />
          {currentStatus}
        </span>
      </div>

      <p className={styles.url}>{url}</p>

      <div className={styles.meta}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>24h uptime</span>
          <span
            className={`${styles.statValue} ${
              uptimePercent24h !== null && parseFloat(uptimePercent24h) >= 99
                ? styles.good
                : uptimePercent24h !== null && parseFloat(uptimePercent24h) >= 95
                ? styles.warn
                : styles.bad
            }`}
          >
            {uptimePercent24h !== null ? `${uptimePercent24h}%` : "—"}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Last check</span>
          <span className={styles.statValue}>
            {formatRelativeTime(lastCheckedAt)}
          </span>
        </div>
      </div>
    </button>
  );
}
