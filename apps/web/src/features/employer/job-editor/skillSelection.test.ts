import { describe, expect, it } from "vitest";
import {
  addSkillSelection,
  removeSkillSelection,
  updateSkillSelection,
} from "./skillSelection";
import type { SkillCatalogItem } from "./types";

const reactSkill: SkillCatalogItem = {
  id: "a0000000-0000-4000-8000-000000000001",
  name: "React",
  normalizedName: "react",
};

const typescriptSkill: SkillCatalogItem = {
  id: "a0000000-0000-4000-8000-000000000002",
  name: "TypeScript",
  normalizedName: "typescript",
};

describe("skill selection helpers", () => {
  it("adds a skill with the backend defaults", () => {
    expect(addSkillSelection([], reactSkill)).toEqual([
      { ...reactSkill, required: true, weight: 1 },
    ]);
  });

  it("does not add the same skill ID twice", () => {
    const selected = addSkillSelection([], reactSkill);
    expect(addSkillSelection(selected, { ...reactSkill, id: reactSkill.id.toUpperCase() })).toEqual(selected);
  });

  it("removes only the matching skill and preserves others", () => {
    const selected = addSkillSelection(
      addSkillSelection([], reactSkill),
      typescriptSkill,
    );

    expect(removeSkillSelection(selected, reactSkill.id)).toEqual([
      { ...typescriptSkill, required: true, weight: 1 },
    ]);
  });

  it("updates required and weight values without changing other selections", () => {
    const selected = addSkillSelection(
      addSkillSelection([], reactSkill),
      typescriptSkill,
    );

    expect(
      updateSkillSelection(selected, reactSkill.id, {
        required: false,
        weight: 2.5,
      }),
    ).toEqual([
      { ...reactSkill, required: false, weight: 2.5 },
      { ...typescriptSkill, required: true, weight: 1 },
    ]);
  });

  it("supports an empty selection", () => {
    expect(removeSkillSelection([], reactSkill.id)).toEqual([]);
  });
});
