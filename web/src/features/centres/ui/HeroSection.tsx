// src/features/centres/ui/HeroSection.tsx

type Props = {
    title: string;
    subtitle?: string; 
    icon?: string; 
    children: React.ReactNode;
  };
  
  
  export default function HeroSection({ title, subtitle, icon, children }: Props) {
    return (
      <div style={{
        margin: '0',
        padding: '0',
        background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
        border: '3px solid #3b82f6', 
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', 
        overflow: 'hidden', 
      }}>


        <div style={{
          padding: '16px 20px',
          background: '#3b82f6',
          color: 'white',
          borderBottom: '2px solid #2563eb', 
        }}>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: subtitle ? '4px' : '0',
          }}>
            {icon && (
              <span style={{ fontSize: '20px' }}>
                {icon}
              </span>
            )}
            <h3 style={{
              fontSize: '16px',
              fontWeight: 700,
              margin: 0,
              color: 'white',
            }}>
              {title}
            </h3>
          </div>
          
          {subtitle && (
            <p style={{
              fontSize: '13px',
              margin: 0,
              opacity: 0.9,
              color: 'white',
            }}>
              {subtitle}
            </p>
          )}
        </div>
        

        <div style={{
          padding: '16px',
          background: 'white',
        }}>
          {children}
        </div>
      </div>
    );
  }
