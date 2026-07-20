import { useEffect, useMemo, useState } from 'react';
import type { ActivityOption, CategoryOption, DistrictOption, DropInAgeFilter, ProgramAgeFilter, ProgramType, RegisteredAgeFilter, StartMonthOption } from '../../../shared/types/index.ts';
import { getFilterOptions } from '../../centres/api/centres.api.ts';
import { WEEKDAY_OPTIONS, type WeekdayName } from '../../../shared/lib/weekday.ts';

type Filters = { category: string; activity: string; activities?: string[]; district: string; weekday: WeekdayName | null ; startMonth?: string; age?: ProgramAgeFilter };

type Props = {
  programType: ProgramType;
  onProgramTypeChange: (v: ProgramType) => void;
  value: Filters;
  onChange: (v: Filters) => void;
  onSearch: () => void;
  onReset: () => void;
  status?: string;
  isOpen: boolean;
  onToggle: () => void;
};

export default function FiltersPanel({ 
  programType,
  onProgramTypeChange,
  value, 
  onChange, 
  onSearch, 
  onReset, 
  status, 
  isOpen, 
  onToggle
}: Props) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [districts, setDistricts]   = useState<DistrictOption[]>([]);
  const [startMonths, setStartMonths] = useState<StartMonthOption[]>([]);

  useEffect(() => {
    (async () => {
      const { categories, activities, districts, startMonths } = await getFilterOptions(programType);

      const sortedActivities = [...activities].sort((a, b) =>
        a.activity.localeCompare(b.activity)
      );
      setCategories(categories);
      setActivities(sortedActivities); 
      setDistricts(districts); 
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

      <div className="filters-panel__header">
        <div className="filters-panel__title-wrap">
          <a className="filters-panel__brand" href="/" aria-label="Reload Toronto Recreation Finder">
            <img src="/trf-logo.svg" alt="Toronto Recreation Finder logo" className="filters-panel__brand-logo" /> 
            <div className="filters-panel__brand-copy">
              <h3>Toronto Recreation Finder</h3>
              <div className="quick-intro">
                Find drop-in / registered programs at Toronto rec centres — fast.
              </div>
            </div>
          </a>
        </div>
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
          gridTemplateColumns: '1fr 1.1fr',
          gap: '8px',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          className={programType === 'dropin' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => onProgramTypeChange('dropin')}
        >
          Drop-in Programs
        </button>
        <button
          type="button"
          className={programType === 'registered' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => onProgramTypeChange('registered')}
        >
          Registered Programs
        </button>
      </div>

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
        <label>District</label>
        <select 
          value={value.district} 
          onChange={e => update({ district: e.target.value })}
        >
          <option value="">All Districts</option>
          {districts.map(d => <option key={d.district} value={d.district}>
            {/* {d.district} ({d.location_count}) */}
            {d.district}
            </option>)}
        </select>
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
        <button className="btn btn-primary" onClick={onSearch}>Search</button>
        <button className="btn btn-secondary" onClick={onReset}>Reset Filters</button>
      </div>

      <div id="status">{status}</div>
    </div>
  );
}
