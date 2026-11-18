export type CandidateStatus =
  | "New"
  | "Reviewing"
  | "Shortlisted"
  | "Interview"
  | "Accepted"
  | "Rejected";

export type CandidateExperience = {
  role: string;
  company: string;
  period: string;
  summary: string;
};

export type CandidateEducation = {
  degree: string;
  school: string;
  period: string;
};

export type CandidateStatusEvent = {
  status: CandidateStatus;
  date: string;
  note: string;
};

export type CandidateApplication = {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  appliedAt: string;
  experienceYears: number;
  status: CandidateStatus;
  location: string;
  summary: string;
  skills: string[];
  experience: CandidateExperience[];
  education: CandidateEducation[];
  resumeName: string;
  notes: string;
  history: CandidateStatusEvent[];
};
