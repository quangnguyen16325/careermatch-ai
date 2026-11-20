/** Company verification contract exposed by the Admin Companies API. */
export type CompanyVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type CompanyVerificationQueueItem = {
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
  _count: {
    jobs: number;
    employers: number;
  };
};

export type CompanyVerificationQueueQuery = {
  page?: number;
  pageSize?: number;
  status?: CompanyVerificationStatus;
  search?: string;
};

export type CompanyVerificationQueueResponse = {
  data: CompanyVerificationQueueItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

export type CompanyVerificationDecision = {
  status: "VERIFIED" | "REJECTED";
  reason?: string;
};

export type CompanyVerificationValidationError =
  "reason-required" | "reason-too-short" | "reason-too-long";
