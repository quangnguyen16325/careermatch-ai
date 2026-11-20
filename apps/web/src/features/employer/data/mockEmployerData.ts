import type { CompanyProfile, JobPosting } from "../types";
import type { CreateCompanyRequest, UpdateCompanyRequest } from "../companyApi";

export const mockCompanyProfile: CompanyProfile = {
  id: "preview-company-1",
  name: "Northstar Labs",
  website: "https://northstarlabs.example",
  location: "District 1, Ho Chi Minh City, Vietnam",
  taxCode: "0312345678",
  description:
    "We build thoughtful software that helps ambitious teams work better. Our team pairs practical engineering with a culture of learning, ownership, and care.",
  verificationStatus: "PENDING",
  verifiedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export function applyCompanyProfilePreview(
  current: CompanyProfile | null,
  request: CreateCompanyRequest | UpdateCompanyRequest,
  mode: "create" | "update",
): CompanyProfile {
  if (mode === "create" || !current) {
    const now = new Date().toISOString();
    return {
      ...mockCompanyProfile,
      id: "preview-company-created",
      name: request.name || "New company",
      description: request.description ?? null,
      website: request.website ?? null,
      location: request.location ?? null,
      taxCode: request.taxCode ?? null,
      verificationStatus: "PENDING",
      verifiedAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  return {
    ...current,
    ...(request.name !== undefined ? { name: request.name } : {}),
    ...(request.description !== undefined
      ? { description: request.description }
      : {}),
    ...(request.website !== undefined ? { website: request.website } : {}),
    ...(request.location !== undefined ? { location: request.location } : {}),
    ...(request.taxCode !== undefined ? { taxCode: request.taxCode } : {}),
    ...(current.verificationStatus === "REJECTED"
      ? { verificationStatus: "PENDING" as const, verifiedAt: null }
      : {}),
    updatedAt: new Date().toISOString(),
  };
}

export const mockJobPostings: JobPosting[] = [
  {
    id: "job-101",
    title: "Frontend Engineer",
    department: "Product Engineering",
    location: "Ho Chi Minh City · Hybrid",
    employmentType: "Full-time",
    salary: "$1,800–$2,600 / month",
    deadline: "2027-03-30",
    status: "Published",
    description:
      "Build accessible, responsive experiences for early-career talent and the teams that hire them.",
    requirements: "React, TypeScript, CSS, and a thoughtful approach to product quality.",
    benefits: "Annual learning budget, flexible hybrid work, health insurance.",
  },
  {
    id: "job-102",
    title: "Backend Developer Intern",
    department: "Platform",
    location: "Ho Chi Minh City · On-site",
    employmentType: "Internship",
    salary: "$500–$700 / month",
    deadline: "2027-02-15",
    status: "Published",
    description:
      "Work with the platform team to build and maintain reliable services for our hiring workflows.",
    requirements: "Familiarity with Node.js, SQL, HTTP APIs, and Git.",
    benefits: "Mentorship, project ownership, and a path to a full-time role.",
  },
  {
    id: "job-103",
    title: "Product Designer",
    department: "Product Design",
    location: "Remote · Vietnam",
    employmentType: "Full-time",
    salary: "$1,500–$2,200 / month",
    deadline: "2027-04-18",
    status: "Draft",
    description:
      "Shape clear, human-centered workflows from early sketches through polished product UI.",
    requirements: "Experience with product design, prototyping, and design systems.",
    benefits: "Remote-first team, flexible hours, and an annual learning budget.",
  },
  {
    id: "job-104",
    title: "People Operations Associate",
    department: "People",
    location: "Ho Chi Minh City · Hybrid",
    employmentType: "Contract",
    salary: "$900–$1,200 / month",
    deadline: "2026-10-20",
    status: "Published",
    description:
      "Help create a welcoming, organized experience for candidates and teammates.",
    requirements: "Strong communication, organization, and a service mindset.",
    benefits: "Collaborative team, flexible schedule, and professional development.",
  },
];
