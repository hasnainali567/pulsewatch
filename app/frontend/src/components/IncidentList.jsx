import styles from "../styles/IncidentList.module.css";

function formatTime(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleString();
}

export default function IncidentList({ incidents }) {
  if (!incidents || incidents.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyIcon}>✅</p>
        <p>No incidents recorded</p>
      </div>
    );
  }

  return (
    <ul className={styles.list}>
      {incidents.map((inc) => (
        <li
          key={inc.id}
          className={`${styles.item} ${
            inc.resolved ? styles.resolved : styles.ongoing
          }`}
        >
          <div className={styles.row}>
            <span
              className={`${styles.statusBadge} ${
                inc.resolved ? styles.badgeResolved : styles.badgeOngoing
              }`}
            >
              {inc.resolved ? "Resolved" : "Ongoing"}
            </span>
            <span className={styles.timeRange}>
              Started {formatTime(inc.started_at)}
              {inc.ended_at && ` — ended ${formatTime(inc.ended_at)}`}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
