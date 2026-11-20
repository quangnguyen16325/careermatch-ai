const companyVerificationStatuses = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
] as const;

type CompanyVerificationStatus = (typeof companyVerificationStatuses)[number];

type CompanyApiProfile = {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  location: string | null;
  taxCode: string | null;
  verificationStatus: CompanyVerificationStatus;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateCompanyRequest = {
  name: string;
  description?: string;
  website?: string;
  location?: string;
  taxCode?: string;
};

type UpdateCompanyRequest = {
  name?: string;
  description?: string | null;
  website?: string | null;
  location?: string | null;
  taxCode?: string | null;
};

type CompanyApiFailure = {
  status: number;
  code?: string;
  message: string;
  details: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCompanyApiFailure(
  status: number,
  payload: unknown,
): CompanyApiFailure {
  const body = isRecord(payload) ? payload : {};
  const rawMessage = body.message;
  const details = Array.isArray(rawMessage)
    ? rawMessage.filter((item): item is string => typeof item === "string")
    : [];
  const message =
    typeof rawMessage === "string"
      ? rawMessage
      : details.length > 0
        ? details.join(" ")
        : "Company request failed.";

  return {
    status,
    ...(typeof body.code === "string" ? { code: body.code } : {}),
    message,
    details,
  };
}

function getCompanyVerificationLabel(
  status: CompanyVerificationStatus,
): string {
  switch (status) {
    case "PENDING":
      return "Pending verification";
    case "VERIFIED":
      return "Verified";
    case "REJECTED":
      return "Rejected";
  }
}

export {
  companyVerificationStatuses,
  getCompanyVerificationLabel,
  normalizeCompanyApiFailure,
};
export type {
  CompanyApiFailure,
  CompanyApiProfile,
  CompanyVerificationStatus,
  CreateCompanyRequest,
  UpdateCompanyRequest,
};
