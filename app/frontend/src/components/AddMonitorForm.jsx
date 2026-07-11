import { useState } from "react";
import styles from "../styles/AddMonitorForm.module.css";

export default function AddMonitorForm({ onAdd }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState(null); // "success" | "error" | null
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setMessage("");

    try {
      await onAdd(name.trim(), url.trim());
      setStatus("success");
      setMessage(`Monitor "${name.trim()}" added`);
      setName("");
      setUrl("");
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2 className={styles.heading}>Add Monitor</h2>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="monitor-name">Name</label>
          <input
            id="monitor-name"
            type="text"
            placeholder="e.g. My API"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={submitting}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="monitor-url">URL</label>
          <input
            id="monitor-url"
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            disabled={submitting}
          />
        </div>
        <button
          type="submit"
          className={styles.button}
          disabled={submitting}
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </div>
      {status && (
        <p className={`${styles.feedback} ${styles[status]}`}>{message}</p>
      )}
    </form>
  );
}
