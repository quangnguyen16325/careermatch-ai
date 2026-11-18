import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  UserRole,
  AccountStatus,
  VerificationStatus,
  JobStatus,
  ApplicationStatus,
  InterviewStatus,
  NotificationType,
} from '../src/generated/prisma/enums.js';

config({ path: ['../../.env', '.env'] });

const connectionString = process.env.DATABASE_URL || 'postgresql://careermatch:careermatch_local@localhost:5432/careermatch?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Standard scrypt hash matching PasswordService for password "Password123!"
const DEFAULT_PASSWORD_HASH =
  'scrypt$131072$8$1$8b4e6ce665b649173e65940066cda9ac$2c58ea5491e691aca8a1d6867c74d3427519f4145d515822643ab56d2f5a4e33022af90d5be3628a91208a3a678f7959753ca07e00147106996af3a915c6f94d';

async function main() {
  console.log('🌱 Starting CareerMatch AI database seeding...');

  // 1. Clean existing data in reverse relation order (clean slate for deterministic seed)
  console.log('🧹 Cleaning existing data...');
  await prisma.notification.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.applicationStatusHistory.deleteMany();
  await prisma.application.deleteMany();
  await prisma.jobMatch.deleteMany();
  await prisma.savedJob.deleteMany();
  await prisma.jobSkill.deleteMany();
  await prisma.job.deleteMany();
  await prisma.careerCategory.deleteMany();
  await prisma.cvExtractedSkill.deleteMany();
  await prisma.cvAnalysis.deleteMany();
  await prisma.cv.deleteMany();
  await prisma.studentSkill.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.employerProfile.deleteMany();
  await prisma.company.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.accountToken.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Skills Catalog
  console.log('📚 Seeding Skills catalog...');
  const skillsData = [
    { name: 'Node.js', normalizedName: 'node.js' },
    { name: 'TypeScript', normalizedName: 'typescript' },
    { name: 'JavaScript', normalizedName: 'javascript' },
    { name: 'NestJS', normalizedName: 'nestjs' },
    { name: 'Express', normalizedName: 'express' },
    { name: 'React', normalizedName: 'react' },
    { name: 'Python', normalizedName: 'python' },
    { name: 'FastAPI', normalizedName: 'fastapi' },
    { name: 'PostgreSQL', normalizedName: 'postgresql' },
    { name: 'Redis', normalizedName: 'redis' },
    { name: 'Docker', normalizedName: 'docker' },
    { name: 'Git', normalizedName: 'git' },
    { name: 'REST API', normalizedName: 'rest api' },
    { name: 'GraphQL', normalizedName: 'graphql' },
    { name: 'Tailwind CSS', normalizedName: 'tailwind css' },
    { name: 'Kubernetes', normalizedName: 'kubernetes' },
  ];

  const skillMap = new Map<string, string>();
  for (const s of skillsData) {
    const created = await prisma.skill.create({ data: s });
    skillMap.set(s.normalizedName, created.id);
  }

  // 3. Seed Career Categories
  console.log('📂 Seeding Career Categories...');
  const devCategory = await prisma.careerCategory.create({
    data: {
      name: 'Software Development',
      description: 'Web, mobile, API, and cloud services engineering.',
    },
  });

  const aiCategory = await prisma.careerCategory.create({
    data: {
      name: 'Artificial Intelligence & Data',
      description: 'Machine learning, NLP, data analysis, and AI application engineering.',
    },
  });

  const cloudCategory = await prisma.careerCategory.create({
    data: {
      name: 'Cloud & DevOps',
      description: 'Cloud infrastructure, CI/CD pipelines, containerization, and system reliability.',
    },
  });

  // 4. Seed Admin User
  console.log('👤 Seeding Admin user...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@careermatch.local',
      passwordHash: DEFAULT_PASSWORD_HASH,
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
      emailVerified: new Date(),
    },
  });

  // 5. Seed Companies & Employer Profiles
  console.log('🏢 Seeding Companies & Employers...');
  const techCorp = await prisma.company.create({
    data: {
      name: 'TechCorp Solutions',
      description: 'Enterprise cloud and software modernization consultancy.',
      website: 'https://techcorp.example.com',
      location: 'TP. Hồ Chí Minh',
      taxCode: '0312345678',
      verificationStatus: VerificationStatus.VERIFIED,
      verifiedAt: new Date(),
    },
  });

  const techCorpUser = await prisma.user.create({
    data: {
      email: 'recruiter.techcorp@careermatch.local',
      passwordHash: DEFAULT_PASSWORD_HASH,
      role: UserRole.EMPLOYER,
      status: AccountStatus.ACTIVE,
      emailVerified: new Date(),
      employer: {
        create: {
          fullName: 'Sarah Jenkins',
          position: 'Head of Talent Acquisition',
          companyId: techCorp.id,
        },
      },
    },
  });

  const innovateAi = await prisma.company.create({
    data: {
      name: 'InnovateAI Labs',
      description: 'High-growth AI research and developer tools startup.',
      website: 'https://innovateai.example.com',
      location: 'Hà Nội',
      taxCode: '0109876543',
      verificationStatus: VerificationStatus.PENDING,
      verifiedAt: null,
    },
  });

  const innovateAiUser = await prisma.user.create({
    data: {
      email: 'talent.innovate@careermatch.local',
      passwordHash: DEFAULT_PASSWORD_HASH,
      role: UserRole.EMPLOYER,
      status: AccountStatus.ACTIVE,
      emailVerified: new Date(),
      employer: {
        create: {
          fullName: 'David Tran',
          position: 'Technical Recruiter',
          companyId: innovateAi.id,
        },
      },
    },
  });

  // 6. Seed Students & Career Profiles
  console.log('🎓 Seeding Students & Career Profiles...');
  const alexUser = await prisma.user.create({
    data: {
      email: 'student.alex@careermatch.local',
      passwordHash: DEFAULT_PASSWORD_HASH,
      role: UserRole.STUDENT,
      status: AccountStatus.ACTIVE,
      emailVerified: new Date(),
      student: {
        create: {
          fullName: 'Alex Nguyen',
          headline: 'Software Engineering Senior @ HCMUT',
          biography: 'Enthusiastic backend engineer with hands-on experience in Node.js, Express, and PostgreSQL.',
          careerGoal: 'Backend Developer',
          location: 'TP. Hồ Chí Minh',
          graduationYear: 2026,
        },
      },
    },
    include: { student: true },
  });
  const alexProfile = alexUser.student!;

  // Add Alex's skills
  const alexSkills = ['node.js', 'express', 'postgresql', 'git', 'rest api', 'react'];
  for (const sk of alexSkills) {
    const id = skillMap.get(sk);
    if (id) {
      await prisma.studentSkill.create({
        data: {
          studentId: alexProfile.id,
          skillId: id,
          level: sk === 'node.js' || sk === 'express' ? 4 : 3,
          source: 'SELF_REPORTED',
        },
      });
    }
  }

  // Add Alex's CV record
  const alexCv = await prisma.cv.create({
    data: {
      studentId: alexProfile.id,
      originalName: 'Alex_Nguyen_CV_2026.pdf',
      storageKey: 'cvs/alex_nguyen_2026.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 154200,
    },
  });

  const baoUser = await prisma.user.create({
    data: {
      email: 'student.baole@careermatch.local',
      passwordHash: DEFAULT_PASSWORD_HASH,
      role: UserRole.STUDENT,
      status: AccountStatus.ACTIVE,
      emailVerified: new Date(),
      student: {
        create: {
          fullName: 'Bao Le',
          headline: 'Computer Science Senior specializing in Full-stack Web & Cloud',
          biography: 'Enjoys crafting intuitive user interfaces with React & TypeScript, with foundational backend knowledge.',
          careerGoal: 'Full-stack Developer',
          location: 'Đà Nẵng',
          graduationYear: 2026,
        },
      },
    },
    include: { student: true },
  });
  const baoProfile = baoUser.student!;

  // Add Bao's skills
  const baoSkills = ['react', 'typescript', 'tailwind css', 'node.js', 'git', 'docker'];
  for (const sk of baoSkills) {
    const id = skillMap.get(sk);
    if (id) {
      await prisma.studentSkill.create({
        data: {
          studentId: baoProfile.id,
          skillId: id,
          level: sk === 'react' || sk === 'typescript' ? 4 : 3,
          source: 'SELF_REPORTED',
        },
      });
    }
  }

  // 7. Seed Job Postings & Required Skills
  console.log('💼 Seeding Job Postings & Required Skills...');
  const backendJob = await prisma.job.create({
    data: {
      companyId: techCorp.id,
      categoryId: devCategory.id,
      title: 'Backend Developer Intern',
      description: 'Join our team to develop performant REST APIs using Node.js, Express, and PostgreSQL. Exposure to Docker containerization and NestJS.',
      location: 'TP. Hồ Chí Minh',
      workMode: 'Hybrid',
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(),
      skills: {
        create: [
          { skillId: skillMap.get('node.js')!, required: true, weight: 1.0 },
          { skillId: skillMap.get('express')!, required: true, weight: 1.0 },
          { skillId: skillMap.get('postgresql')!, required: true, weight: 1.0 },
          { skillId: skillMap.get('rest api')!, required: true, weight: 0.9 },
          { skillId: skillMap.get('git')!, required: true, weight: 0.8 },
          { skillId: skillMap.get('docker')!, required: true, weight: 0.8 },
          { skillId: skillMap.get('nestjs')!, required: false, weight: 0.6 },
        ],
      },
    },
  });

  const fullstackJob = await prisma.job.create({
    data: {
      companyId: techCorp.id,
      categoryId: devCategory.id,
      title: 'Full-stack Web Developer Trainee',
      description: 'Exciting trainee position building responsive web interfaces in React & TypeScript paired with Node.js APIs.',
      location: 'TP. Hồ Chí Minh',
      workMode: 'On-site',
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(),
      skills: {
        create: [
          { skillId: skillMap.get('react')!, required: true, weight: 1.0 },
          { skillId: skillMap.get('typescript')!, required: true, weight: 1.0 },
          { skillId: skillMap.get('tailwind css')!, required: true, weight: 0.8 },
          { skillId: skillMap.get('node.js')!, required: false, weight: 0.7 },
          { skillId: skillMap.get('git')!, required: true, weight: 0.8 },
        ],
      },
    },
  });

  const aiJob = await prisma.job.create({
    data: {
      companyId: innovateAi.id,
      categoryId: aiCategory.id,
      title: 'AI Engineering Intern',
      description: 'Build backend pipelines using Python and FastAPI. Integrate vector search with pgvector for recommendation algorithms.',
      location: 'Hà Nội',
      workMode: 'Remote',
      status: JobStatus.PENDING_APPROVAL, // For moderation testing
      publishedAt: null,
      skills: {
        create: [
          { skillId: skillMap.get('python')!, required: true, weight: 1.0 },
          { skillId: skillMap.get('fastapi')!, required: true, weight: 1.0 },
          { skillId: skillMap.get('docker')!, required: false, weight: 0.7 },
          { skillId: skillMap.get('postgresql')!, required: true, weight: 0.8 },
        ],
      },
    },
  });

  const cloudDraftJob = await prisma.job.create({
    data: {
      companyId: techCorp.id,
      categoryId: cloudCategory.id,
      title: 'Junior Cloud Infrastructure Associate',
      description: 'Draft job for upcoming cloud migration project.',
      location: 'TP. Hồ Chí Minh',
      workMode: 'On-site',
      status: JobStatus.DRAFT, // For draft testing
      publishedAt: null,
    },
  });

  // 8. Seed AI Match Scores (Demonstrating Explainable Matching & Skill Gap)
  console.log('🤖 Seeding AI Match Scores...');
  await prisma.jobMatch.create({
    data: {
      studentId: alexProfile.id,
      jobId: backendJob.id,
      score: 91.0,
      skillScore: 88.0,
      semanticScore: 94.0,
      matchedSkills: ['Node.js', 'Express', 'PostgreSQL', 'Git', 'REST API'],
      missingSkills: ['Docker'],
      explanation: 'Alex matches 91% of requirements. Strong proficiency in Node.js, Express, and PostgreSQL. Docker is missing for complete alignment.',
      engineVersion: 'rule-based-v1',
    },
  });

  // 9. Seed Applications, History & Interview Lifecycle
  console.log('📝 Seeding Applications & Interview Lifecycle...');
  const alexApp = await prisma.application.create({
    data: {
      studentId: alexProfile.id,
      jobId: backendJob.id,
      status: ApplicationStatus.SHORTLISTED,
      coverLetter: 'I am excited to apply for the Backend Developer Intern position at TechCorp Solutions. My academic and project experience in Node.js matches your tech stack.',
      history: {
        create: [
          {
            fromStatus: null,
            toStatus: ApplicationStatus.SUBMITTED,
            reason: 'Applicant submitted profile and CV',
            changedById: alexUser.id,
          },
          {
            fromStatus: ApplicationStatus.SUBMITTED,
            toStatus: ApplicationStatus.REVIEWING,
            reason: 'Recruiter reviewed match score and profile',
            changedById: techCorpUser.id,
          },
          {
            fromStatus: ApplicationStatus.REVIEWING,
            toStatus: ApplicationStatus.SHORTLISTED,
            reason: 'Strong skill alignment (91% match)',
            changedById: techCorpUser.id,
          },
        ],
      },
    },
  });

  const interviewDate = new Date();
  interviewDate.setDate(interviewDate.getDate() + 3);
  interviewDate.setHours(14, 0, 0, 0);

  const baoApp = await prisma.application.create({
    data: {
      studentId: baoProfile.id,
      jobId: fullstackJob.id,
      status: ApplicationStatus.INTERVIEW,
      coverLetter: 'I have developed multiple React and TypeScript apps and would love to contribute to TechCorp Solutions as a Full-stack Trainee.',
      history: {
        create: [
          {
            fromStatus: null,
            toStatus: ApplicationStatus.SUBMITTED,
            reason: 'Applicant submitted profile and CV',
            changedById: baoUser.id,
          },
          {
            fromStatus: ApplicationStatus.SUBMITTED,
            toStatus: ApplicationStatus.SHORTLISTED,
            reason: 'Profile matched frontend requirements',
            changedById: techCorpUser.id,
          },
          {
            fromStatus: ApplicationStatus.SHORTLISTED,
            toStatus: ApplicationStatus.INTERVIEW,
            reason: 'Invited to technical discussion',
            changedById: techCorpUser.id,
          },
        ],
      },
      interviews: {
        create: [
          {
            scheduledAt: interviewDate,
            durationMin: 45,
            meetingUrl: 'https://meet.google.com/careermatch-interview-bao',
            location: 'TechCorp Office, District 1, HCMC / Google Meet',
            status: InterviewStatus.PROPOSED,
            notes: 'Technical round covering React hooks, state management, and basic Node.js APIs.',
          },
        ],
      },
    },
  });

  // 10. Seed Notifications
  console.log('🔔 Seeding Notifications...');
  await prisma.notification.createMany({
    data: [
      {
        userId: alexUser.id,
        type: NotificationType.APPLICATION_SHORTLISTED,
        title: 'Application Shortlisted',
        body: 'TechCorp Solutions has shortlisted your application for Backend Developer Intern.',
        data: { jobId: backendJob.id, applicationId: alexApp.id },
      },
      {
        userId: baoUser.id,
        type: NotificationType.INTERVIEW_INVITATION,
        title: 'Interview Invitation Received',
        body: 'TechCorp Solutions invited you to an interview for Full-stack Web Developer Trainee.',
        data: { jobId: fullstackJob.id, applicationId: baoApp.id },
      },
      {
        userId: techCorpUser.id,
        type: NotificationType.NEW_APPLICATION,
        title: 'New Application Received',
        body: 'Alex Nguyen has submitted an application for Backend Developer Intern.',
        data: { jobId: backendJob.id, applicantName: 'Alex Nguyen' },
      },
      {
        userId: adminUser.id,
        type: NotificationType.COMPANY_VERIFICATION_REQUIRED,
        title: 'Company Verification Request',
        body: 'InnovateAI Labs has registered and submitted tax documentation for verification.',
        data: { companyId: innovateAi.id, companyName: 'InnovateAI Labs' },
      },
      {
        userId: adminUser.id,
        type: NotificationType.JOB_APPROVAL_REQUIRED,
        title: 'Job Posting Approval Required',
        body: 'InnovateAI Labs submitted job "AI Engineering Intern" for moderation.',
        data: { jobId: aiJob.id, jobTitle: 'AI Engineering Intern' },
      },
    ],
  });

  console.log('✅ CareerMatch AI database seeding completed successfully!');
  console.log('------------------------------------------------------------');
  console.log('Sample Accounts for Testing (Password: Password123!):');
  console.log('  👑 Admin:     admin@careermatch.local');
  console.log('  🏢 Employer:  recruiter.techcorp@careermatch.local (TechCorp - VERIFIED)');
  console.log('  🏢 Employer:  talent.innovate@careermatch.local    (InnovateAI - PENDING)');
  console.log('  🎓 Student:   student.alex@careermatch.local       (Alex Nguyen - Backend focus)');
  console.log('  🎓 Student:   student.baole@careermatch.local      (Bao Le - Fullstack focus)');
  console.log('------------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
