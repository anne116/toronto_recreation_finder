// web/src/features/centres/ui/RegisteredControls.tsx
import { useMemo } from "react";
import type { RegisteredProgram } from "../../../shared/types";
import {
  CATEGORY_TAGS,
  type CategoryTag,
  getCanonicalSections,
  categoryForSection,
} from "../../../shared/lib/registered.derive";

type Props = {
  programs: RegisteredProgram[];
  selectedCategory: CategoryTag | null;
  onSelectCategory: (c: CategoryTag) => void;
  selectedSection: string | null;
  onSelectSection: (s: string | null) => void;
};

export default function RegisteredControls({
  programs,
  selectedCategory,
  onSelectCategory,
  selectedSection,
  onSelectSection,
}: Props) {

    const currentSections = useMemo(
      () => getCanonicalSections(selectedCategory),
      [selectedCategory]
    );

    const availability = useMemo( () => {
        const counts = new Map<string, number>();
        for (const p of programs) {
            const sec = (p.section ?? "").trim()
            if (!sec) continue;
            if (selectedCategory && categoryForSection(sec) !== selectedCategory) continue;
            counts.set(sec, (counts.get(sec) ?? 0) + 1);
        }
        return counts;
    }, [programs, selectedCategory]);


  return (
    <div className="info-section">
      <h3>Registered Programs</h3>

      {/* 8 category tags */}
      <div className="program-types-container open" style={{ marginBottom: 12 }}>
        {CATEGORY_TAGS.map((cat) => (
          <button
            type="button"
            key={`cat-${cat}`}
            className={`badge program-type-badge ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => onSelectCategory(cat)}
            aria-pressed={selectedCategory === cat}
            title={`Show ${cat} sections`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Section dropdown (depends on selected category) */}
      <div className="filter-group">
        <label>Section</label>
        <select
          value={selectedSection ?? ""}
          onChange={(e) => onSelectSection(e.target.value || null)}
          disabled={!selectedCategory}
        >
          <option value="">
            {selectedCategory ? `All ${selectedCategory} sections` : "Select a category first"}
          </option>
          {currentSections.map((sec) => {
            const count = availability.get(sec) ?? 0;
            return (
                <option key={`sec-${sec}`} value={sec} disabled={count === 0}>
                    {count === 0 ? `${sec} (0)` : `${sec} (${count})`}
                </option>
            );
          })}
        </select>
      </div>      
    </div>
  );
}
