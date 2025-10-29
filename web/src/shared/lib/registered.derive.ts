// web/src/shared/lib/registered.derive.ts
import type { RegisteredProgram } from "../types";

export const CATEGORY_TAGS = [
  "Arts",
  "Camp",
  "Fitness",
  "Hobbies and Interests",
  "Skate",
  "Sports",
  "Swim",
  "Others",
] as const;

export type CategoryTag = (typeof CATEGORY_TAGS)[number];

export const CATEGORY_SECTIONS: Record<CategoryTag, string[]> = {
    Arts: [
      "Arts - Crafts",
      "Arts - Dance",
      "Arts - Music",
      "Arts - Performing Arts",
      "Arts - Visual Arts",
      "Arts - Workshops",
    ],
    Camp: [
      "CampTO",
      "CampTO Explore",
      "CampTO Plus",
    ],
    Fitness: [
      "FitnessTO - Cardio",
      "FitnessTO - Dance",
      "FitnessTO - Functional Fit",
      "FitnessTO - Low Impact",
      "FitnessTO - Mind and Body",
      "FitnessTO - Strength",
    ],
    "Hobbies and Interests": [
      "Hobbies and Interests - Cards and Games",
      "Hobbies and Interests - Clubs",
      "Hobbies and Interests - Cooking",
      "Hobbies and Interests - Gardening",
      "Hobbies and Interests - Learning",
      "Hobbies and Interests - Nature",
      "Hobbies and Interests - Older Adult Trip",
      "Hobbies and Interests - Science",
      "Hobbies and Interests - Special Events",
      "Hobbies and Interests - Technology",
      "Hobbies and Interests - Workshops",
    ],
    Skate: [
      "Skate - Figure Skating",
      "Skate - Hockey",
      "Skate - Learn to Skate",
    ],
    Sports: [
      "Sports - Adventure Sports",
      "Sports - Badminton",
      "Sports - Ball Hockey",
      "Sports - Baseball/Softball",
      "Sports - Basketball",
      "Sports - Clinics and Workshops",
      "Sports - Cricket",
      "Sports - Cycling",
      "Sports - Dodgeball",
      "Sports - Golf",
      "Sports - Gymnastics",
      "Sports - Martial Arts",
      "Sports - Multi-Sport",
      "Sports - Pickleball",
      "Sports - Soccer",
      "Sports - Tennis and Table Tennis",
      "Sports - Volleyball",
    ],
    Swim: [
      "Swim - Adult and Older Adult Swim 1-3",
      "Swim - Aquatic Sport and Competitive",
      "Swim - Clinics",
      "Swim - Guardian Swim 1-3",
      "Swim - Pre-Lifeguard",
      "Swim - Preschool Swim 1-4 and Tiny Tots",
      "Swim - Small Group/Semi/Private Lessons",
      "Swim - Stroke Improvement and Swim Fit",
      "Swim - Swim to Survive",
      "Swim - Ultra Swim 1-9",
      "Swim - Youth Ultra Swim 1-3",
    ],
    Others: [
      "Adapted Activities",
      "Adapted CampTO",
      "Adapted Swim",
      "Adapted Virtual Programming",
      "After School Care Programs",
      "Aquatic Leadership",
      "Early Years Play Programming",
      "Leadership and Employment Readiness",
    ],
  };

export function getCanonicalSections(category: CategoryTag | null): string[] {
    return category ? CATEGORY_SECTIONS[category] ?? [] : [];
}


export function categoryForSection(sectionRaw: string | null | undefined): CategoryTag {
  const section = (sectionRaw ?? "").trim();
  if (section.startsWith("Arts - ")) return "Arts";
  if (section.startsWith("CampTO")) return "Camp";
  if (section.startsWith("FitnessTO - ")) return "Fitness";
  if (section.startsWith("Hobbies and Interests - ")) return "Hobbies and Interests";
  if (section.startsWith("Skate - ")) return "Skate";
  if (section.startsWith("Sports - ")) return "Sports";
  if (section.startsWith("Swim - ") || section === "Swim") return "Swim";
  return "Others";
}


export function filterPrograms(
  programs: RegisteredProgram[],
  selectedCategory: CategoryTag | null,
  selectedSection: string | null
): RegisteredProgram[] {
  return programs.filter((p) => {
    const sec = (p.section ?? "").trim();
    if (!sec) return false;
    if (selectedCategory && categoryForSection(sec) !== selectedCategory) return false;
    if (selectedSection && sec !== selectedSection) return false;
    return true;
  });
}
