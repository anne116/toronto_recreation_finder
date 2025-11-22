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
        borderBottom: '1px solid #0a5df7',
        background: '#0a5df7'
      }}>
        <h2 style={{ 
          fontSize: '20px', 
          fontWeight: 700, 
          color: '#e2e8f0',
          marginBottom: '8px'
        }}>
          {name}
        </h2>
        <div style={{ 
          fontSize: '14px', 
          color: '#e2e8f0',
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