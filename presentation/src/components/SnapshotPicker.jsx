const SnapshotPicker = ({ manifest, date, onDateChange }) => {
  if (!manifest?.snapshots?.length) return null;

  const groups = {};
  for (const s of manifest.snapshots) {
    if (!groups[s.category]) groups[s.category] = [];
    groups[s.category].push(s);
  }

  const labels = { daily: 'Recent', weekly: 'Weekly', monthly: 'Monthly' };
  const order = ['daily', 'weekly', 'monthly'];

  return (
    <select
      className="snapshot-picker"
      value={date}
      onChange={(e) => onDateChange(e.target.value)}
    >
      {order.map(cat =>
        groups[cat] ? (
          <optgroup key={cat} label={labels[cat]}>
            {groups[cat].map(s => (
              <option key={s.date} value={s.date}>{s.date}</option>
            ))}
          </optgroup>
        ) : null
      )}
    </select>
  );
};

export default SnapshotPicker;
