// src/features/centres/ui/CollapsibleSection.tsx

import { useState, useRef, useEffect } from 'react';

type Props = {
  title: string; 
  count?: number;             
  defaultOpen?: boolean;     
  children: React.ReactNode;  
};

export default function CollapsibleSection({ 
  title, 
  count, 
  defaultOpen = false, 
  children 
}: Props) {

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>(defaultOpen ? 'auto' : 0);
 
  useEffect(() => {
    if (!contentRef.current) return;
    
    if (isOpen) {
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
      
      const timer = setTimeout(() => setContentHeight('auto'), 300);
      return () => clearTimeout(timer);
    } else {
      setContentHeight(contentRef.current.scrollHeight);
      
      requestAnimationFrame(() => {
        setContentHeight(0);
      });
    }
  }, [isOpen]);

  
  const toggle = () => setIsOpen(prev => !prev);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };
   
  return (
    <div style={{ marginBottom: '8px' }}>

      <button
        onClick={toggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-controls={`section-${title}`} 
        style={{
          width: '100%',
          padding: '12px 16px',
          background: isOpen ? '#dbeafe' : '#f1f5f9',  
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = isOpen ? '#bfdbfe' : '#e2e8f0';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = isOpen ? '#dbeafe' : '#f1f5f9';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            fontWeight: 600, 
            fontSize: '14px', 
            color: '#1e293b' 
          }}>
            {title}
          </span>
          

          {count !== undefined && (
            <span style={{
              background: isOpen ? '#3b82f6' : '#94a3b8',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              minWidth: '24px',
              textAlign: 'center',
            }}>
              {count}
            </span>
          )}
        </div>
        
        <span style={{
          fontSize: '12px',
          color: '#64748b',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s',  
          display: 'inline-block',
        }}>
          ▼
        </span>
      </button>
      

      <div
        id={`section-${title}`}
        ref={contentRef}
        style={{
          height: contentHeight,  
          overflow: 'hidden',  
          transition: 'height 0.3s ease-in-out',  
        }}
        aria-hidden={!isOpen}
      >

        <div style={{ 
          padding: '16px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}