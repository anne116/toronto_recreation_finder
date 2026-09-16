import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useCentreNameFilter, type CentreNameOption } from '../../centres/hooks/useCentreNameFilter';
import type { ProgramType } from '../../../shared/types';
import { haversineDistanceKm } from '../../../shared/lib/geo';
import { levenshteinDistance } from '../../../shared/lib/textMatch';

type Props = {
  programType: ProgramType;
  locationId?: string | number;
  locationName?: string;
  onChange: (centre: { locationId?: string | number; locationName?: string }) => void;
  userLocation?: { lat: number; lon: number } | null;
  maxDistanceKm?: number;
  onOutsideRadiusWarning?: (message: string | null) => void;
};

export default function CentreSearchField({
  programType,
  locationId,
  locationName,
  onChange,
  userLocation,
  maxDistanceKm,
  onOutsideRadiusWarning,
}: Props) {
  const { options, loading } = useCentreNameFilter(programType);
  const [draftText, setDraftText] = useState(locationName ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftText(locationName ?? '');
  }, [locationName]);

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

  const matches = useMemo(() => {
    if (!normalizedQuery) return [];
    return options.filter((option) => option.name.toLowerCase().includes(normalizedQuery));
  }, [options, normalizedQuery]);

  const didYouMean = useMemo(() => {
    if (!normalizedQuery || normalizedQuery.length < 4 || matches.length > 0) return null;

    let best: CentreNameOption | null = null;
    let bestDistance = Infinity;
    for (const option of options) {
      const distance = levenshteinDistance(normalizedQuery, option.name.toLowerCase());
      if (distance < bestDistance) {
        bestDistance = distance;
        best = option;
      }
    }

    if (best && bestDistance <= Math.max(2, Math.floor(best.name.length * 0.3))) {
      return best;
    }
    return null;
  }, [options, normalizedQuery, matches.length]);

  function checkRadius(option: CentreNameOption) {
    if (!onOutsideRadiusWarning) return;
    if (!userLocation || !maxDistanceKm || option.lat == null || option.lon == null) {
      onOutsideRadiusWarning(null);
      return;
    }
    const distanceKm = haversineDistanceKm(userLocation, { lat: option.lat, lon: option.lon });
    onOutsideRadiusWarning(
      distanceKm > maxDistanceKm ? `📏 ${option.name} is outside your ${maxDistanceKm} km radius.` : null
    );
  }

  useEffect(() => {
    if (locationId == null) {
      onOutsideRadiusWarning?.(null);
      return;
    }
    const selected = options.find((option) => String(option.id) === String(locationId));
    if (!selected) {
      onOutsideRadiusWarning?.(null);
      return;
    }
    checkRadius(selected);
  }, [locationId, userLocation, maxDistanceKm, options]);

  function selectCentre(option: CentreNameOption) {
    setDraftText(option.name);
    onChange({ locationId: option.id, locationName: option.name });
    setIsOpen(false);
  }

  function handleInputChange(text: string) {
    setDraftText(text);
    setIsOpen(true);

    const normalized = text.trim().toLowerCase();
    const exact = options.find((option) => option.name.toLowerCase() === normalized);
    if (exact) {
      onChange({ locationId: exact.id, locationName: exact.name });
    } else if (locationId != null) {
      onChange({ locationId: undefined, locationName: undefined });
    }
  }

  function handleClear() {
    setDraftText('');
    onChange({ locationId: undefined, locationName: undefined });
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      if (matches.length > 0) {
        selectCentre(matches[0]);
      } else if (didYouMean) {
        selectCentre(didYouMean);
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }

  const showDropdown = isOpen && normalizedQuery.length > 0 && (matches.length > 0 || Boolean(didYouMean) || loading);

  return (
    <div className="filter-group" ref={containerRef} style={{ position: 'relative' }}>
      <label>Recreation Centre</label>
      <div className="search-combobox-input-wrap">
        <input
          type="text"
          value={draftText}
          placeholder="Search by centre name"
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
            aria-label="Clear centre search"
            onClick={handleClear}
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="search-combobox-dropdown" role="listbox">
          {loading && options.length === 0 && (
            <div className="search-combobox-dropdown-status">Loading centres…</div>
          )}
          {didYouMean && matches.length === 0 && (
            <button
              type="button"
              role="option"
              aria-selected={false}
              className="search-combobox-dropdown-item search-combobox-dropdown-item--suggestion"
              onClick={() => selectCentre(didYouMean)}
            >
              Did you mean <strong>{didYouMean.name}</strong>?
            </button>
          )}
          {matches.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={String(option.id) === String(locationId)}
              className="search-combobox-dropdown-item"
              onClick={() => selectCentre(option)}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
