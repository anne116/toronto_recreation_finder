type Props = { value: { centres: boolean; wards: boolean }; onChange: (v: { centres: boolean; wards: boolean }) => void };

export default function Legend({ value, onChange }: Props) {
  return (
    <div className="legend">
      <div className="legend-title">Map Layers</div>
      
      <label className="legend-item">
        <input 
          type="checkbox"
          checked={value.centres} 
          onChange={e => onChange({ ...value, centres: e.target.checked })} 
        />
        <div 
          className="legend-icon"
          style={{ 
            width: 10,
            height: 10,
            borderRadius: 999,
            background: '#3b82f6',
            border: '2px solid #ffffff',
            boxSizing: 'border-box',
          }}
        />
        <span className="legend-text">Recreation Centres</span>
      </label>

      <label className="legend-item">
        <input 
          type="checkbox"
          checked={value.wards} 
          onChange={e => onChange({ ...value, wards: e.target.checked })} 
        />
        <div 
          className="legend-icon"
          style={{ 
            width: 28,
            height: 3,
            borderRadius: 999, 
            background: '#1e293b' }} />
        <span className="legend-text">Ward Boundaries</span>
      </label>
    </div>
  );
}
