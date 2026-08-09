import { useEffect, useMemo, useState } from 'react';
import { MdOutlineDirectionsWalk, MdOutlineEventAvailable } from 'react-icons/md';
import Spinner from '../../../shared/ui/Spinner';
import type { ActivityOption, CategoryOption, DropInAgeFilter, ProgramAgeFilter, ProgramType, RegisteredAgeFilter, StartMonthOption } from '../../../shared/types/index.ts';
import { getFilterOptions } from '../../centres/api/centres.api.ts';
import { WEEKDAY_OPTIONS, type WeekdayName } from '../../../shared/lib/weekday.ts';
import { isFreeCentreLocation } from '../../../shared/data/freeCentres';
import CentreSearchField from './CentreSearchField';
import InfoTooltip from '../../../shared/ui/InfoTooltip';

type Filters = { category: string; activity: string; activities?: string[]; weekday: WeekdayName | null ; startMonth?: string; age?: ProgramAgeFilter; locationId?: string | number; locationName?: string; maxDistanceKm?: number; freeCentresOnly?: boolean };

type Props = {
  programType: ProgramType;
  onProgramTypeChange: (v: ProgramType) => void;
  value: Filters;
  onChange: (v: Filters) => void;
  onSearch: () => void;
  onReset: () => void;
  isOpen: boolean;
  onToggle: () => void;
  isSearching?: boolean;
  userLocation?: { lat: number; lon: number } | null;
  locateMeLoading?: boolean;
  locateMeError?: string | null;
  locationPermissionDenied?: boolean;
  onRequestLocation: () => void;
  onDisableDistanceSearch: () => void;
};

export default function FiltersPanel({
  programType,
  onProgramTypeChange,
  value,
  onChange,
  onSearch,
  onReset,
  isOpen,
  onToggle,
  isSearching = false,
  userLocation,
  locateMeLoading = false,
  locateMeError,
  locationPermissionDenied = false,
  onRequestLocation,
  onDisableDistanceSearch,
}: Props) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [startMonths, setStartMonths] = useState<StartMonthOption[]>([]);
  const [lastDistanceValue, setLastDistanceValue] = useState(value.maxDistanceKm ?? 5);
  const [centreOutsideRadiusWarning, setCentreOutsideRadiusWarning] = useState<string | null>(null);
  const [freeCentreMismatchWarning, setFreeCentreMismatchWarning] = useState<string | null>(null);

  useEffect(() => {
    setCentreOutsideRadiusWarning(null);
  }, [value.maxDistanceKm, userLocation]);

  useEffect(() => {
    if (value.freeCentresOnly && value.locationId != null && !isFreeCentreLocation(value.locationId)) {
      setFreeCentreMismatchWarning(`🆓 ${value.locationName ?? 'This centre'} is not a Free Centre — showing results for it anyway.`);
    } else {
      setFreeCentreMismatchWarning(null);
    }
  }, [value.freeCentresOnly, value.locationId, value.locationName]);

  useEffect(() => {
    (async () => {
      const { categories, activities, startMonths } = await getFilterOptions(programType);

      const sortedCategories = [...categories].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      const sortedActivities = [...activities].sort((a, b) =>
        a.activity.localeCompare(b.activity)
      );
      setCategories(sortedCategories);
      setActivities(sortedActivities);
      setStartMonths(startMonths ?? []);
    })();
  }, [programType]);

  const update = (patch: Partial<Filters>) => {
    onChange({ ...value, activities: undefined, ...patch });
  };
  const categoryActivities = useMemo(() => {
    if (!value.category) return [];
    return categories.find((item) => item.name === value.category)?.activities ?? [];
  }, [categories, value.category]);
  const visibleActivities = useMemo(() => {
    if (!value.category) return activities
    const allowed = new Set(categoryActivities);
    return activities.filter((item) => allowed.has(item.activity));
  }, [activities, categoryActivities, value.category]);

  return (
    <div className="filters-panel">

      <div className="program-type-group">
        <div className="program-type-group__row">
          <label className="program-type-group__label">Program Type</label>
          <button
            type="button"
            className="filters-panel__toggle"
            onClick={onToggle}
            aria-label={isOpen ? 'Close filters' : 'Open filters'}
            aria-expanded={isOpen}
            title={isOpen ? 'Close filters' : 'Open filters'}
          >
            <span className="filters-panel__toggle-icon">{isOpen ? '✕' : '☰'}</span>
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
          }}
        >
          <button
            type="button"
            className={programType === 'dropin' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => onProgramTypeChange('dropin')}
          >
            <MdOutlineDirectionsWalk size={18} />
            Drop-in
          </button>
          <button
            type="button"
            className={programType === 'registered' ? 'btn btn-primary' : 'btn btn-secondary'}
            onClick={() => onProgramTypeChange('registered')}
          >
            <MdOutlineEventAvailable size={18} />
            Registered
          </button>
        </div>
      </div>

      <CentreSearchField
        programType={programType}
        locationId={value.locationId}
        locationName={value.locationName}
        onChange={(centre) => update(centre)}
        userLocation={userLocation}
        maxDistanceKm={value.maxDistanceKm}
        onOutsideRadiusWarning={setCentreOutsideRadiusWarning}
      />
      {centreOutsideRadiusWarning && (
        <div className="locate-me-error locate-me-error--dismissible">
          <span>{centreOutsideRadiusWarning}</span>
          <button
            type="button"
            className="filter-pill-remove"
            aria-label="Dismiss"
            onClick={() => setCentreOutsideRadiusWarning(null)}
          >
            ✕
          </button>
        </div>
      )}
      {freeCentreMismatchWarning && (
        <div className="locate-me-error locate-me-error--dismissible">
          <span>{freeCentreMismatchWarning}</span>
          <button
            type="button"
            className="filter-pill-remove"
            aria-label="Dismiss"
            onClick={() => setFreeCentreMismatchWarning(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="filter-group">
        <label>Category</label>
        <select
          value={value.category}
          onChange={e => update({ category: e.target.value, activity: '' })}
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category.name} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Activity</label>
        <select
          value={value.activity}
          onChange={e => update({ activity: e.target.value })}
        >
          <option value="">
            All Activities
          </option>
          {visibleActivities.map(a =>
            <option key={a.activity} value={a.activity}>
              {a.activity}
            </option>)}
        </select>
        {value.activities && value.activities.length > 0 && (
          <div
            className="filter-multi-activity-note"
            title={value.activities.join(', ')}
          >
            Showing {value.activities.length} related activities
          </div>
        )}
      </div>

      <div className="filter-group">
        <div className="distance-toggle-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="distance-search-toggle">Find near me</label>
            {locateMeLoading && <Spinner size={16} label="Locating" />}
          </div>
          <label className="distance-toggle-switch">
            <input
              id="distance-search-toggle"
              type="checkbox"
              checked={value.maxDistanceKm != null}
              onChange={(e) => {
                if (e.target.checked) {
                  update({ maxDistanceKm: lastDistanceValue });
                  onRequestLocation();
                } else {
                  onDisableDistanceSearch();
                }
              }}
            />
            <span className="distance-toggle-slider" aria-hidden="true" />
          </label>
        </div>

        {value.maxDistanceKm != null && (
          <>
            <div className="distance-value-row">
              within{' '}
              <span className={`distance-value${userLocation ? '' : ' distance-value--pending'}`}>
                {value.maxDistanceKm}
              </span>{' '}
              km
            </div>
            <div className="distance-slider-wrap">
              <input
                type="range"
                min={1}
                max={25}
                step={1}
                value={value.maxDistanceKm}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setLastDistanceValue(v);
                  update({ maxDistanceKm: v });
                }}
              />
            </div>
            {locationPermissionDenied && (
              <div className="locate-me-error">Location blocked — tap the map to set it yourself.</div>
            )}
            {!locationPermissionDenied && locateMeError && (
              <div className="locate-me-error">{locateMeError}</div>
            )}
          </>
        )}
      </div>

      <div className="filter-group">
        <div className="distance-toggle-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label htmlFor="free-centres-toggle">Free Centres Only</label>
            <InfoTooltip
              label="About Free Centres"
              text="Drop-in and registered programs are free for Toronto residents at these Free Centres. Registration may still be required. Club memberships and facility rentals are not included."
              learnMoreUrl="https://www.toronto.ca/explore-enjoy/parks-recreation/how-to-use-our-services/how-to-register-for-recreation-programs/free-lower-cost-recreation-options/"
              learnMoreLinkType="free_centres_info"
            />
          </div>
          <label className="distance-toggle-switch">
            <input
              id="free-centres-toggle"
              type="checkbox"
              checked={Boolean(value.freeCentresOnly)}
              onChange={(e) => update({ freeCentresOnly: e.target.checked || undefined })}
            />
            <span className="distance-toggle-slider" aria-hidden="true" />
          </label>
        </div>
      </div>

      {programType === 'dropin' ? (
        <div className="filter-group">
          <label>Day of Week</label>
          <select 
            value={value.weekday ?? ''}
            onChange={(e) => update({ weekday: e.target.value === '' ? null : (e.target.value as WeekdayName)})}
          >
            <option value="">Any Day</option>
            {WEEKDAY_OPTIONS.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="filter-group">
          <label>Start Month</label>
          <select
            value={value.startMonth ?? ''}
            onChange={(e) => update({ startMonth: e.target.value || undefined })}
          >
            <option value="">All Months</option>
            {startMonths.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="filter-group">
        <label>{programType === 'dropin' ? 'Age' : 'Age Group'}</label>
        <select
          value={value.age ?? ''}
          onChange={(e) => {
            const v = e.target.value as '' | ProgramAgeFilter;
            onChange({...value, age: v === '' ? undefined : v });
          }}
        >
          <option value="">All ages</option>
          {programType === 'dropin' ? (
            <>
              <option value={'children' satisfies DropInAgeFilter}>Children (0-12)</option>
              <option value={'teens' satisfies DropInAgeFilter}>Teens (13-17)</option>
              <option value={'young_adults' satisfies DropInAgeFilter}>Young Adults (18-24)</option>
              <option value={'adults' satisfies DropInAgeFilter}>Adults (25-59)</option>
              <option value={'seniors' satisfies DropInAgeFilter}>Seniors (60+)</option>
            </>
          ) : (
            <>
              <option value={'infants_toddlers' satisfies RegisteredAgeFilter}>Infants & Toddlers (0-2)</option>
              <option value={'preschool_early_childhood' satisfies RegisteredAgeFilter}>Preschool & Early Childhood (3-5)</option>
              <option value={'children' satisfies RegisteredAgeFilter}>Children (6-12)</option>
              <option value={'teens' satisfies RegisteredAgeFilter}>Teens (13-17)</option>
              <option value={'young_adults' satisfies RegisteredAgeFilter}>Young Adults (18-24)</option>
              <option value={'adults' satisfies RegisteredAgeFilter}>Adults (25-59)</option>
              <option value={'seniors' satisfies RegisteredAgeFilter}>Seniors (60+)</option>
            </>
          )}
        </select>
      </div>

      <div className="filter-group">
        <button className="btn btn-primary" onClick={onSearch} disabled={isSearching}>
          {isSearching ? <Spinner size={16} onDark label="Searching" /> : 'Search'}
        </button>
        <button className="btn btn-secondary" onClick={onReset}>Reset Filters</button>
      </div>
    </div>
  );
}
