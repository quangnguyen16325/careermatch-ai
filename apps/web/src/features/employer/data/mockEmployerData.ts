import type { CompanyProfile, JobPosting } from "../types";

export const emptyCompanyProfile: CompanyProfile = {
  name: "",
  logoUrl: "",
  coverUrl: "",
  address: "",
  website: "",
  contactEmail: "",
  phone: "",
  industry: "",
  size: "",
  description: "",
};

export const mockCompanyProfile: CompanyProfile = {
  name: "Northstar Labs",
  logoUrl: "",
  coverUrl: "",
  address: "District 1, Ho Chi Minh City, Vietnam",
  website: "https://northstarlabs.example",
  contactEmail: "careers@northstarlabs.example",
  phone: "+84 28 7300 1234",
  industry: "Software & Technology",
  size: "51–200 employees",
  description:
    "We build thoughtful software that helps ambitious teams work better. Our team pairs practical engineering with a culture of learning, ownership, and care.",
};

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
