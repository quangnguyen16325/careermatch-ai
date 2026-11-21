import type {
  CreateJobDraftInput,
  JobDraftFieldErrors,
  JobDraftSubmission,
  JobSkillInput,
} from "./types";

// Matches validator.js isUUID(value) used by the backend's @IsUUID() decorator.
const UUID_PATTERN =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function validateJobDraft(input: CreateJobDraftInput): JobDraftFieldErrors {
  const errors: JobDraftFieldErrors = {};
  const titleLength = input.title.trim().length;
  const descriptionLength = input.description.trim().length;

  if (titleLength < 3 || titleLength > 255) {
    errors.title = "Job title must be between 3 and 255 characters.";
  }

  if (descriptionLength < 10 || descriptionLength > 10000) {
    errors.description =
      "Job description must be between 10 and 10,000 characters.";
  }

  if (input.categoryId?.trim() && !isValidUuid(input.categoryId.trim())) {
    errors.categoryId = "Choose a valid career category.";
  }

  if (input.skills?.some(({ skillId }) => !isValidUuid(skillId.trim()))) {
    errors.skills = "Each selected skill must have a valid skill ID.";
  } else if (
    input.skills?.some(
      ({ required }) => required !== undefined && typeof required !== "boolean",
    )
  ) {
    errors.skills = "Each skill's required setting must be valid.";
  } else if (
    input.skills?.some(
      ({ weight }) =>
        weight !== undefined &&
        (!Number.isFinite(weight) || weight < 0.1 || weight > 10),
    )
  ) {
    errors.skills = "Skill weights must be between 0.1 and 10.";
  }

  const skillIds = input.skills?.map(({ skillId }) => skillId.trim().toLowerCase());
  if (!errors.skills && skillIds && new Set(skillIds).size !== skillIds.length) {
    errors.skills = "A skill can only be selected once.";
  }

  return errors;
}

function prepareJobDraftSubmission(
  input: CreateJobDraftInput,
): JobDraftSubmission {
  const errors = validateJobDraft(input);
  if (Object.keys(errors).length > 0) return { valid: false, errors };

  const location = input.location?.trim();
  const categoryId = input.categoryId?.trim();

  return {
    valid: true,
    payload: {
      title: input.title.trim(),
      description: input.description.trim(),
      ...(location ? { location } : {}),
      ...(input.workMode ? { workMode: input.workMode } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(input.skills
        ? { skills: normalizeRequiredSkills(input.skills) }
        : {}),
    },
  };
}

function normalizeRequiredSkills(
  skills: readonly JobSkillInput[],
): JobSkillInput[] {
  const seen = new Set<string>();
  const normalized: JobSkillInput[] = [];

  skills.forEach((skill, index) => {
    const skillId = skill.skillId.trim();
    if (!isValidUuid(skillId)) {
      throw new TypeError(`Skill ID at index ${index} must be a valid UUID.`);
    }

    const dedupeKey = skillId.toLowerCase();
    if (seen.has(dedupeKey)) return;

    seen.add(dedupeKey);
    normalized.push({ ...skill, skillId });
  });

  return normalized;
}

export {
  isValidUuid,
  normalizeRequiredSkills,
  prepareJobDraftSubmission,
  validateJobDraft,
};
