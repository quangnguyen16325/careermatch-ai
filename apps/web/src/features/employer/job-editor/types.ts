/** Fields accepted by the employer job draft endpoints. Keep this aligned with
 * CreateJobDto, UpdateJobDto, and JobSkillInputDto in the API. */
export const JOB_WORK_MODES = ["ONSITE", "HYBRID", "REMOTE"] as const;

export type JobWorkMode = (typeof JOB_WORK_MODES)[number];

export type JobSkillInput = {
  skillId: string;
  required?: boolean;
  weight?: number;
};

export type CreateJobDraftInput = {
  title: string;
  description: string;
  location?: string;
  workMode?: JobWorkMode;
  categoryId?: string;
  skills?: JobSkillInput[];
};

export type UpdateJobInput = {
  title?: string;
  description?: string;
  location?: string | null;
  workMode?: JobWorkMode | null;
  categoryId?: string | null;
  skills?: JobSkillInput[];
};

export type SkillCatalogItem = {
  id: string;
  name: string;
  normalizedName: string;
};

export type JobDraftFieldErrors = Partial<
  Record<"title" | "description" | "skills", string>
>;
