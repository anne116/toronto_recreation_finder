import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ActivityOption } from '../../../shared/types';
import { levenshteinDistance } from '../../../shared/lib/textMatch';

type Props = {
  activities: ActivityOption[];
  value: string;
  onChange: (activity: string) => void;
};

const ALL_ACTIVITIES_LABEL = 'All Activities';

export default function ActivitySearchField({ activities, value, onChange }: Props) {
  const [draftText, setDraftText] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftText(value);
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const normalizedQuery = draftText.trim().toLowerCase();
  const isBrowsing = normalizedQuery === '';

  const matches = useMemo(() => {
    if (isBrowsing) return activities;
    return activities.filter((option) => option.activity.toLowerCase().includes(normalizedQuery));
  }, [activities, normalizedQuery, isBrowsing]);

  const didYouMean = useMemo(() => {
    if (isBrowsing || normalizedQuery.length < 4 || matches.length > 0) return null;

    let best: ActivityOption | null = null;
    let bestDistance = Infinity;
    for (const option of activities) {
      const distance = levenshteinDistance(normalizedQuery, option.activity.toLowerCase());
      if (distance < bestDistance) {
        bestDistance = distance;
        best = option;
      }
    }

    if (best && bestDistance <= Math.max(2, Math.floor(best.activity.length * 0.3))) {
      return best;
    }
    return null;
  }, [activities, normalizedQuery, matches.length, isBrowsing]);

  function selectActivity(activity: string) {
    setDraftText(activity);
    onChange(activity);
    setIsOpen(false);
  }

  function handleInputChange(text: string) {
    setDraftText(text);
    setIsOpen(true);

    const normalized = text.trim().toLowerCase();
    if (normalized === ALL_ACTIVITIES_LABEL.toLowerCase()) {
      onChange('');
      return;
    }
    const exact = activities.find((option) => option.activity.toLowerCase() === normalized);
    if (exact) {
      onChange(exact.activity);
    } else if (value) {
      onChange('');
    }
  }

  function handleClear() {
    setDraftText('');
    onChange('');
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      if (isBrowsing) {
        selectActivity('');
      } else if (matches.length > 0) {
        selectActivity(matches[0].activity);
      } else if (didYouMean) {
        selectActivity(didYouMean.activity);
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }

  const showDropdown = isOpen && (isBrowsing || matches.length > 0 || Boolean(didYouMean));

  return (
    <div className="filter-group" ref={containerRef} style={{ position: 'relative' }}>
      <label>Activity</label>
      <div className="search-combobox-input-wrap">
        <input
          type="text"
          value={draftText}
          placeholder={ALL_ACTIVITIES_LABEL}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />
        {draftText && (
          <button
            type="button"
            className="search-combobox-clear"
            aria-label="Clear activity search"
            onClick={handleClear}
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="search-combobox-dropdown" role="listbox">
          {isBrowsing && (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className="search-combobox-dropdown-item"
              onClick={() => selectActivity('')}
            >
              {ALL_ACTIVITIES_LABEL}
            </button>
          )}
          {didYouMean && matches.length === 0 && (
            <button
              type="button"
              role="option"
              aria-selected={false}
              className="search-combobox-dropdown-item search-combobox-dropdown-item--suggestion"
              onClick={() => selectActivity(didYouMean.activity)}
            >
              Did you mean <strong>{didYouMean.activity}</strong>?
            </button>
          )}
          {matches.map((option) => (
            <button
              key={option.activity}
              type="button"
              role="option"
              aria-selected={option.activity === value}
              className="search-combobox-dropdown-item"
              onClick={() => selectActivity(option.activity)}
            >
              {option.activity}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
