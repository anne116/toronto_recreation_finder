import { useEffect, useMemo, useState } from 'react';
import type { ActivityOption, CategoryOption, DistrictOption, AgeFilter } from '../../../shared/types/index.ts';
import { getFilterOptions } from '../../centres/api/centres.api.ts';

type Filters = { category: string; activity: string; district: string; weekday: string; age?: AgeFilter };

type Props = {
  value: Filters;
  onChange: (v: Filters) => void;
  onSearch: () => void;
  onReset: () => void;
  status?: string;
  isOpen: boolean;
  onToggle: () => void;
};

export default function FiltersPanel({ value, onChange, onSearch, onReset, status, isOpen, onToggle }: Props) {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [districts, setDistricts]   = useState<DistrictOption[]>([]);

  useEffect(() => {
    (async () => {
      const { categories, activities, districts } = await getFilterOptions();

      const sortedActivities = [...activities].sort((a, b) =>
        a.activity.localeCompare(b.activity)
      );
      setCategories(categories);
      setActivities(sortedActivities); 
      setDistricts(districts); 
    })();
  }, []);

  const update = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
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
            <img src="/trf-logo.png" alt="Toronto Recreation Finder logo" className="filters-panel__brand-logo" /> 
            <div className="filters-panel__brand-copy">
              <h3>Toronto Recreation Finder</h3>
            </div>
          </a>
          <div className="quick-intro">Search drop-in programs that match your needs across Toronto recreation centres!</div>
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
      </div>

      <div className="filter-group">
        <label>District</label>
        <select value={value.district} onChange={e => update({ district: e.target.value })}>
          <option value="">All Districts</option>
          {districts.map(d => <option key={d.district} value={d.district}>
            {/* {d.district} ({d.location_count}) */}
            {d.district}
            </option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>Day of Week</label>
        <select value={value.weekday} onChange={e => update({ weekday: e.target.value })}>
          <option value="">Any Day</option>
          <option value="0">Monday</option>
          <option value="1">Tuesday</option>
          <option value="2">Wednesday</option>
          <option value="3">Thursday</option>
          <option value="4">Friday</option>
          <option value="5">Saturday</option>
          <option value="6">Sunday</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Age</label>
        <select
          value={value.age ?? ''}
          onChange={(e) => {
            const v = e.target.value as '' | AgeFilter;
            onChange({ ...value, age: v === '' ? undefined : v });
          }}
        >
          <option value="">All ages</option>
          <option value="children">Children (0-12)</option>
          <option value="teens">Teens (13-17)</option>
          <option value="young_adults">Young Adults (18-24)</option>
          <option value="adults">Adults (25-59)</option>
          <option value="seniors">Seniors (60+)</option>
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
