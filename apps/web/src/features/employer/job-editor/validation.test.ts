import { describe, expect, it } from "vitest";
import {
  isValidUuid,
  normalizeRequiredSkills,
  prepareJobDraftSubmission,
  validateJobDraft,
} from "./validation";
import type { CreateJobDraftInput } from "./types";

const validDraft: CreateJobDraftInput = {
  title: "Frontend Engineer",
  description: "Build accessible product experiences.",
};

describe("validateJobDraft", () => {
  it("accepts draft fields at the backend minimum lengths", () => {
    expect(
      validateJobDraft({ title: "abc", description: "1234567890" }),
    ).toEqual({});
  });

  it("requires a trimmed title between 3 and 255 characters", () => {
    expect(validateJobDraft({ ...validDraft, title: "  " }).title).toBeTruthy();
    expect(validateJobDraft({ ...validDraft, title: "ab" }).title).toBeTruthy();
    expect(
      validateJobDraft({ ...validDraft, title: ` ${"a".repeat(256)} ` }).title,
    ).toBeTruthy();
  });

  it("requires a trimmed description between 10 and 10,000 characters", () => {
    expect(
      validateJobDraft({ ...validDraft, description: "  short  " }).description,
    ).toBeTruthy();
    expect(
      validateJobDraft({ ...validDraft, description: "a".repeat(10001) })
        .description,
    ).toBeTruthy();
  });

  it("accepts optional location, work mode, category and skills when omitted", () => {
    expect(validateJobDraft(validDraft)).toEqual({});
  });

  it("validates the optional location limit and supported work modes", () => {
    expect(
      validateJobDraft({ ...validDraft, location: "x".repeat(256) }).location,
    ).toBe("Location must be 255 characters or fewer.");
    expect(
      validateJobDraft({ ...validDraft, location: "x".repeat(255) }).location,
    ).toBeUndefined();
    expect(
      validateJobDraft({ ...validDraft, workMode: "REMOTE" }).workMode,
    ).toBeUndefined();
    expect(
      validateJobDraft({ ...validDraft, workMode: "FLEX" as never }).workMode,
    ).toBe("Choose a supported work mode.");
  });

  it("reports empty or malformed skill IDs", () => {
    expect(
      validateJobDraft({
        ...validDraft,
        skills: [{ skillId: "" }],
      }).skills,
    ).toBeTruthy();
    expect(
      validateJobDraft({
        ...validDraft,
        skills: [{ skillId: "not-a-uuid" }],
      }).skills,
    ).toBeTruthy();
  });

  it("rejects duplicate skill IDs instead of silently accepting them", () => {
    const skillId = "a0000000-0000-4000-8000-000000000001";
    expect(
      validateJobDraft({
        ...validDraft,
        skills: [{ skillId }, { skillId: skillId.toUpperCase() }],
      }).skills,
    ).toBe("A skill can only be selected once.");
  });

  it("accepts skill weights from 0.1 through 10 and rejects values outside the range", () => {
    const skillId = "a0000000-0000-4000-8000-000000000001";
    for (const weight of [0.1, 10]) {
      expect(
        validateJobDraft({ ...validDraft, skills: [{ skillId, weight }] })
          .skills,
      ).toBeUndefined();
    }
    for (const weight of [0, 10.1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        validateJobDraft({ ...validDraft, skills: [{ skillId, weight }] })
          .skills,
      ).toBe("Skill weights must be between 0.1 and 10.");
    }
  });

  it("does not require a skills selection", () => {
    expect(validateJobDraft({ ...validDraft, skills: [] })).toEqual({});
  });

  it("validates an optional category ID when one is selected", () => {
    expect(
      validateJobDraft({ ...validDraft, categoryId: "not-a-uuid" }).categoryId,
    ).toBeTruthy();
    expect(
      validateJobDraft({
        ...validDraft,
        categoryId: "c0000000-0000-4000-8000-000000000001",
      }).categoryId,
    ).toBeUndefined();
  });
});

describe("normalizeRequiredSkills", () => {
  const firstSkillId = "a0000000-0000-4000-8000-000000000001";
  const secondSkillId = "a0000000-0000-4000-8000-000000000002";

  it("trims IDs and removes duplicates without changing the first selection", () => {
    expect(
      normalizeRequiredSkills([
        { skillId: ` ${firstSkillId} `, required: true, weight: 2 },
        { skillId: firstSkillId.toUpperCase(), required: false, weight: 3 },
        { skillId: secondSkillId },
      ]),
    ).toEqual([
      { skillId: firstSkillId, required: true, weight: 2 },
      { skillId: secondSkillId },
    ]);
  });

  it("rejects empty and malformed IDs instead of silently dropping them", () => {
    expect(() => normalizeRequiredSkills([{ skillId: " " }])).toThrow(
      "Skill ID at index 0 must be a valid UUID.",
    );
    expect(() => normalizeRequiredSkills([{ skillId: "bad-id" }])).toThrow(
      TypeError,
    );
  });

  it("matches the backend UUID format validator", () => {
    expect(isValidUuid(firstSkillId)).toBe(true);
    expect(isValidUuid("00000000-0000-0000-0000-000000000000")).toBe(true);
    expect(isValidUuid("a0000000-0000-0000-0000-000000000001")).toBe(false);
  });

  it("returns an empty list when there are no selected skills", () => {
    expect(normalizeRequiredSkills([])).toEqual([]);
  });
});

describe("prepareJobDraftSubmission", () => {
  it("returns trimmed contract fields and omits blank optional fields", () => {
    expect(
      prepareJobDraftSubmission({
        title: "  Frontend Engineer  ",
        description: "  Build product experiences.  ",
        location: "   ",
        categoryId: "",
      }),
    ).toEqual({
      valid: true,
      payload: {
        title: "Frontend Engineer",
        description: "Build product experiences.",
      },
    });
  });

  it("returns field errors without a payload when required values are invalid", () => {
    expect(
      prepareJobDraftSubmission({ title: "ab", description: "short" }),
    ).toEqual({
      valid: false,
      errors: {
        title: "Job title must be between 3 and 255 characters.",
        description:
          "Job description must be between 10 and 10,000 characters.",
      },
    });
  });
});
