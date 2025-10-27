import { useEffect, useState } from 'react';
import type { ActivityOption, DistrictOption, FacilityTypeOption, AgeFilter } from '../../../shared/types/index.ts';
import { getFilterOptions } from '../../centres/api/centres.api';

type Filters = { activity: string; district: string; weekday: string; age: AgeFilter; facility_type: string };

type Props = {
  value: Filters;
  onChange: (v: Filters) => void;
  onSearch: () => void;
  onReset: () => void;
  onNearMe: () => void;
  status: string;
};

export default function FiltersPanel({ value, onChange, onSearch, onReset, onNearMe, status }: Props) {
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [districts, setDistricts]   = useState<DistrictOption[]>([]);
  const [types, setTypes]           = useState<FacilityTypeOption[]>([]);

  useEffect(() => {
    (async () => {
      const { activities, districts, facilityTypes } = await getFilterOptions();
      setActivities(activities); setDistricts(districts); setTypes(facilityTypes);
    })();
  }, []);

  const update = (patch: Partial<Filters>) => onChange({ ...value, ...patch });

  return (
    <div className="filters-panel">
      <h3>Toronto Recreation Finder</h3>

      <div className="filter-group">
        <label>Activity / Program</label>
        <select value={value.activity} onChange={e => update({ activity: e.target.value })}>
          <option value="">All Activities</option>
          {activities.map(a => <option key={a.activity} value={a.activity}>{a.activity} ({a.count})</option>)}
        </select>
      </div>

      <div className="filter-group">
        <label>District</label>
        <select value={value.district} onChange={e => update({ district: e.target.value })}>
          <option value="">All Districts</option>
          {districts.map(d => <option key={d.district} value={d.district}>{d.district} ({d.location_count})</option>)}
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
        <select value={value.age} onChange={e => update({ age: e.target.value as AgeFilter })}>
          <option value="">All Ages</option>
          <option value="young">Under 12</option>
          <option value="teen">13-18</option>
          <option value="adult">19-65</option>
          <option value="senior">65+</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Facility Type</label>
        <select value={value.facility_type} onChange={e => update({ facility_type: e.target.value })}>
          <option value="">All Types</option>
          {types.map(t => <option key={t.facility_type} value={t.facility_type}>{t.facility_type} ({t.count})</option>)}
        </select>
      </div>

      <div className="filter-group">
        <button className="btn btn-primary" onClick={onSearch}>Search</button>
        <button className="btn btn-secondary" onClick={onReset}>Reset Filters</button>
      </div>

      <div className="filter-group">
        <button className="btn btn-link" onClick={onNearMe}>Find Near Me</button>
      </div>

      <div id="status">{status}</div>
    </div>
  );
}
