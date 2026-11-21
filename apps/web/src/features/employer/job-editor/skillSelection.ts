import type { SkillCatalogItem } from "./types";

type SelectedJobSkill = SkillCatalogItem & {
  required: boolean;
  weight: number;
};

function addSkillSelection(
  selected: readonly SelectedJobSkill[],
  skill: SkillCatalogItem,
): SelectedJobSkill[] {
  if (selected.some(({ id }) => id.toLowerCase() === skill.id.toLowerCase())) {
    return [...selected];
  }

  return [...selected, { ...skill, required: true, weight: 1 }];
}

function removeSkillSelection(
  selected: readonly SelectedJobSkill[],
  skillId: string,
): SelectedJobSkill[] {
  return selected.filter(({ id }) => id.toLowerCase() !== skillId.toLowerCase());
}

function updateSkillSelection(
  selected: readonly SelectedJobSkill[],
  skillId: string,
  update: Partial<Pick<SelectedJobSkill, "required" | "weight">>,
): SelectedJobSkill[] {
  return selected.map((skill) =>
    skill.id.toLowerCase() === skillId.toLowerCase()
      ? { ...skill, ...update }
      : skill,
  );
}

export { addSkillSelection, removeSkillSelection, updateSkillSelection };
export type { SelectedJobSkill };
