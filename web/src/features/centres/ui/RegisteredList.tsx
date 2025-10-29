import type { RegisteredProgram } from "../../../shared/types";

type Props = { programs: RegisteredProgram[] };

export default function RegisteredList({ programs }: Props) {
  if (!programs?.length) {
    return (
      <div className="info-section">
        <div className="info-value">No registered programs match your filters</div>
      </div>
    );
  }

  return (
    <div className="info-section">
      <h3>Registered Programs</h3>

      <div className="program-list" id="registered-list">
        {programs.map((p, i) => {
          // Prefer stable IDs if you have them; fallback to index to avoid duplicate keys
          const key =
            String(p.course_id ?? p.course_instance_id ?? p.occurrence_id ?? i);

          return (
            <div className="program-item" key={key}>
              {/* Top row: Section and a 'View' link if available */}
              <div className="flex items-start justify-between">
                <div className="text-sm text-gray-500">
                  {p.section ?? "-"}
                </div>
                {p.activity_url ? (
                  <a
                    className="text-sm underline hover:no-underline"
                    href={p.activity_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                ) : null}
              </div>

              {/* Titles */}
              <div className="program-title font-semibold">
                {p.activity_title ?? "-"}
              </div>
              <div className="text-sm text-gray-700">
                {p.course_title ?? "-"}
              </div>

              {/* Details row: Days, From–To, Status */}
              <div className="program-details text-sm text-gray-800">
                <span className="text-gray-500">Days:</span>{" "}
                {p.days_of_week ?? "-"}{" "}
                {" | "}
                <span className="text-gray-500">From–To:</span>{" "}
                {p.from_to ?? "-"}{" "}
                {p.status_info ? (
                  <>
                    {" | "}
                    <span className="text-gray-500">Status:</span>{" "}
                    {p.status_info}
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
