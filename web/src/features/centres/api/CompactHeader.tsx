type Props = {
    name: string;
    address?: string;
    phone?: string;
    district?: string;
  };
  
  export default function CompactHeader({ name, address, phone, district }: Props) {
    return (
      <div style={{ 
        padding: '16px 20px',
        borderBottom: '1px solid #e2e8f0',
        background: '#f8fafc'
      }}>
        <h2 style={{ 
          fontSize: '18px', 
          fontWeight: 700, 
          color: '#1e293b',
          marginBottom: '8px'
        }}>
          {name}
        </h2>
        <div style={{ 
          fontSize: '13px', 
          color: '#64748b',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {address && (
            <span>
              📍 {address}
            </span>
          )}
          {phone && phone !== "None" && (
            <span>
              📞 {phone}
            </span>
          )}
          {district && (
            <span>
              🏙️ {district}
            </span>
          )}
        </div>
      </div>
    );
  }