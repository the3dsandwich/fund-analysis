import { useNavigate, useParams } from 'react-router-dom';

const SnapshotPicker = ({ manifest, date }) => {
  const navigate = useNavigate();
  const { name } = useParams();

  if (!manifest?.snapshots?.length) return null;

  const groups = {};
  for (const s of manifest.snapshots) {
    if (!groups[s.category]) groups[s.category] = [];
    groups[s.category].push(s);
  }

  const labels = { daily: 'Recent', weekly: 'Weekly', monthly: 'Monthly' };
  const order = ['daily', 'weekly', 'monthly'];

  const handleChange = (e) => {
    const newDate = e.target.value;
    if (name) {
      navigate(`/${newDate}/category/${encodeURIComponent(name)}`);
    } else {
      navigate(`/${newDate}`);
    }
  };

  return (
    <select
      className="snapshot-picker"
      value={date || ''}
      onChange={handleChange}
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
