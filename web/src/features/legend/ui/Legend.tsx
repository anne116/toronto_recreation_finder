type Props = { value: { centres: boolean; wards: boolean }; onChange: (v: { centres: boolean; wards: boolean }) => void };

export default function Legend({ value, onChange }: Props) {
  return (
    <div className="legend">
      <div className="legend-title">Map Layers</div>
      <label className="legend-item">
        <input type="checkbox" checked={value.centres} onChange={e => onChange({ ...value, centres: e.target.checked })} />
        <div className="legend-icon" style={{ background: '#3b82f6' }} />
        <span className="legend-text">Recreation Centres</span>
      </label>
      <label className="legend-item">
        <input type="checkbox" checked={value.wards} onChange={e => onChange({ ...value, wards: e.target.checked })} />
        <div className="legend-icon" style={{ border: '2px solid #1e293b', background: 'transparent' }} />
        <span className="legend-text">Ward Boundaries</span>
      </label>
    </div>
  );
}
