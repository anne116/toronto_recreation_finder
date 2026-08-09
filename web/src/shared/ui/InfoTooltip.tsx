import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '../lib/analytics';
import './InfoTooltip.css';

type Props = {
  text: string;
  label?: string;
  learnMoreUrl?: string;
  learnMoreLinkType?: string;
};

export default function InfoTooltip({ text, label = 'More info', learnMoreUrl, learnMoreLinkType }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className={`info-tooltip${isOpen ? ' info-tooltip--open' : ''}`} ref={containerRef}>
      <button
        type="button"
        className="info-tooltip-trigger"
        aria-label={label}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
      >
        ⓘ
      </button>
      <div className="info-tooltip-bubble" role="tooltip">
        {text}
        {learnMoreUrl && ' '}
        {learnMoreUrl && (
          <a
            href={learnMoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="info-tooltip-link"
            onClick={(e) => {
              e.stopPropagation();
              trackEvent('external_link_clicked', {
                link_type: learnMoreLinkType ?? 'info_tooltip',
                url: learnMoreUrl,
              });
            }}
          >
            Learn more
          </a>
        )}
      </div>
    </div>
  );
}
