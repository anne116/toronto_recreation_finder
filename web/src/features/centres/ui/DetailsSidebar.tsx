import type { AgeFilter } from '../../../shared/types';
import { useCentreDetails } from '../hooks/useCentreDetails';

type Props = { centreId: string | number | null; age: AgeFilter; onClose: () => void };

export default function DetailsSidebar({ centreId, age, onClose }: Props) {
  const { detail, programs, facilities, loading } = useCentreDetails(centreId, age);

  return (
    <div className={`details-sidebar ${centreId ? 'open' : ''}`} id="detailsSidebar">
      <div className="sidebar-resizer" />
      <div className="sidebar-header">
        <button className="close-btn" onClick={onClose}>×</button>
        <h2 id="sidebarTitle">{detail?.name ?? 'Centre Details'}</h2>
        <p id="sidebarSubtitle" style={{ opacity: 0.9, fontSize: 14 }}>
          {detail?.facility_type || (centreId ? 'Recreation Centre' : '')}
        </p>
      </div>

      <div className="sidebar-content" id="sidebarContent">
        {!centreId && <div className="empty-state">Select a centre on the map to view details</div>}
        {loading && <div className="empty-state">Loading…</div>}

        {detail && (
          <>
            <div className="info-section">
              <h3>Location Information</h3>
              {detail.address && <div className="info-row"><span className="info-label">Address:</span><span className="info-value">{detail.address}</span></div>}
              {detail.district && <div className="info-row"><span className="info-label">District:</span><span className="info-value">{detail.district}</span></div>}
              {detail.intersection && <div className="info-row"><span className="info-label">Intersection:</span><span className="info-value">{detail.intersection}</span></div>}
              {detail.ttc_information && <div className="info-row"><span className="info-label">TTC:</span><span className="info-value">{detail.ttc_information}</span></div>}
              {detail.phone && detail.phone !== 'None' && <div className="info-row"><span className="info-label">Phone:</span><span className="info-value">{detail.phone}</span></div>}
            </div>

            <div className="info-section">
              <h3>Accessibility</h3>
              <div className="info-value">{detail.accessibility || 'Information not available'}</div>
            </div>

            {detail.amenities && detail.amenities !== 'None' && (
              <div className="info-section">
                <h3>Amenities</h3>
                {detail.amenities.split(',').map(a => <span key={a.trim()} className="badge badge-blue">{a.trim()}</span>)}
              </div>
            )}

            {programs.dropin.length > 0 && (
              <div className="info-section">
                <h3>Drop-in Programs</h3>
                <div className="program-list" id="dropin-list">
                  {programs.dropin.map((p, i) => (
                    <div className="program-item" key={i}>
                      <div className="program-title">{p.course_title}</div>
                      <div className="program-details">
                        {(p.day_of_week && p.start_time) && `${p.day_of_week} ${p.start_time?.slice(0,5)} - ${p.end_time?.slice(0,5)}`}
                        {(p.age_min || p.age_max) && (() => {
                          let ageStr = '';
                          if (p.age_min && p.age_max) ageStr = `Ages: ${p.age_min}-${p.age_max}`;
                          else if (p.age_min)        ageStr = `Ages: ${p.age_min}+`;
                          else if (p.age_max)        ageStr = `Ages: Under ${p.age_max}`;
                          return ageStr ? ` | ${ageStr}` : '';
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {programs.registered.length > 0 && (
              <div className="info-section">
                <h3>Registered Programs</h3>
                <div className="program-list" id="registered-list">
                  {programs.registered.map((p, i) => (
                    <div className="program-item" key={i}>
                      <div className="program-title">{p.course_title}</div>
                      <div className="program-details">
                        {p.days_of_week}
                        {p.program_category && ` | ${p.program_category}`}
                        {(p.min_age || p.max_age) && (() => {
                          let ageStr = '';
                          if (p.min_age && p.max_age) ageStr = `Ages: ${p.min_age}-${p.max_age}`;
                          else if (p.min_age)         ageStr = `Ages: ${p.min_age}+`;
                          else if (p.max_age)         ageStr = `Ages: Under ${p.max_age}`;
                          return ageStr ? ` | ${ageStr}` : '';
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {programs.dropin.length === 0 && programs.registered.length === 0 && (
              <div className="info-section"><div className="info-value">No programs match your age filter</div></div>
            )}

            {facilities.length > 0 && (
              <div className="info-section">
                <h3>Facilities</h3>
                {Object.entries(facilities.reduce<Record<string, number>>((acc, f) => {
                  acc[f.facility_type] = (acc[f.facility_type] || 0) + 1;
                  return acc;
                }, {})).map(([type, count]) => (
                  <span key={type} className="badge badge-blue">{type} ({count})</span>
                ))}
              </div>
            )}

            {detail.description && detail.description !== 'None' && (
              <div className="info-section">
                <h3>Description</h3>
                <div className="info-value">{detail.description}</div>
              </div>
            )}

            {detail.url && detail.url !== 'None' && (
              <a href={detail.url} target="_blank" className="external-link">View on Toronto.ca</a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
