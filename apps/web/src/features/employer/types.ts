import type { CompanyApiProfile } from "./companyApi";

export type CompanyProfile = CompanyApiProfile;

export type JobStatus = "Published" | "Draft" | "Closed";
export type EmploymentType = "Full-time" | "Part-time" | "Contract" | "Internship";

export type JobPosting = {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  salary: string;
  deadline: string;
  status: JobStatus;
  description: string;
  requirements: string;
  benefits: string;
};
