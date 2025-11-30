import { useEffect, useState } from 'react';
import type { ActivityOption, DistrictOption, AgeFilter } from '../../../shared/types/index.ts';
import { getFilterOptions } from '../../centres/api/centres.api.ts';

type Filters = { activity: string; district: string; weekday: string; age?: AgeFilter };

type Props = {
  value: Filters;
  onChange: (v: Filters) => void;
  onSearch: () => void;
  onReset: () => void;
  onNearMe: () => void;
  status?: string;
};

export default function FiltersPanel({ value, onChange, onSearch, onReset, onNearMe, status }: Props) {
  const [activities, setActivities] = useState<ActivityOption[]>([]);
  const [districts, setDistricts]   = useState<DistrictOption[]>([]);

  useEffect(() => {
    (async () => {
      const { activities, districts } = await getFilterOptions();

      const sortedActivities = [...activities].sort((a, b) =>
        a.activity.localeCompare(b.activity)
      );
      setActivities(sortedActivities); 
      setDistricts(districts); 
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
          {activities.map(a => 
            <option key={a.activity} value={a.activity}>
              {/* {a.activity} ({a.count}) */}
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
          <option value="young">Young (≤12)</option>
          <option value="teen">Teen (13–18)</option>
          <option value="adult">Adult (19–65)</option>
          <option value="senior">Senior (55+)</option>
        </select>
      </div>



      <div className="filter-group">
        <button className="btn btn-primary" onClick={onSearch}>Search</button>
        <button className="btn btn-secondary" onClick={onReset}>Reset Filters</button>
      </div>

      {/* <div className="filter-group">
        <button className="btn btn-link" onClick={onNearMe}>Find Near Me</button>
      </div> */}

      <div id="status">{status}</div>
    </div>
  );
}
