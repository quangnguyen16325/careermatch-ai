export type CompanyProfile = {
  name: string;
  logoUrl: string;
  coverUrl: string;
  address: string;
  website: string;
  contactEmail: string;
  phone: string;
  industry: string;
  size: string;
  description: string;
};

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
