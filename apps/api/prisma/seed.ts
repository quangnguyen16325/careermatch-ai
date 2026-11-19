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

// Safety Guard: Refuse to seed demo credentials or fixtures in production
if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production') {
  console.error('❌ Refusing to seed demo fixtures or reset database in production environment.');
  process.exit(1);
}

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://careermatch:careermatch_local@localhost:5432/careermatch?schema=public';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Standard scrypt hash matching PasswordService for password "Password123!"
const DEFAULT_PASSWORD_HASH =
  'scrypt$131072$8$1$8b4e6ce665b649173e65940066cda9ac$2c58ea5491e691aca8a1d6867c74d3427519f4145d515822643ab56d2f5a4e33022af90d5be3628a91208a3a678f7959753ca07e00147106996af3a915c6f94d';

async function main() {
  console.log('🌱 Starting CareerMatch AI database seeding...');

  const isResetRequested =
    process.env.SEED_RESET === '1' || process.env.SEED_DISPOSABLE === '1';

  // Execute entire seed within an atomic transaction with generous timeout
  await prisma.$transaction(
    async (tx) => {
      // 1. Destructive reset ONLY when explicitly opted-in via disposable flag
      if (isResetRequested) {
        console.log('🧹 Explicit SEED_RESET / SEED_DISPOSABLE opt-in: cleaning fixtures in transaction...');
        await tx.notification.deleteMany();
        await tx.interview.deleteMany();
        await tx.applicationStatusHistory.deleteMany();
        await tx.application.deleteMany();
        await tx.jobMatch.deleteMany();
        await tx.savedJob.deleteMany();
        await tx.jobSkill.deleteMany();
        await tx.job.deleteMany();
        await tx.careerCategory.deleteMany();
        await tx.cvExtractedSkill.deleteMany();
        await tx.cvAnalysis.deleteMany();
        await tx.cv.deleteMany();
        await tx.studentSkill.deleteMany();
        await tx.skill.deleteMany();
        await tx.studentProfile.deleteMany();
        await tx.employerProfile.deleteMany();
        await tx.company.deleteMany();
        await tx.auditLog.deleteMany();
        await tx.report.deleteMany();
        await tx.refreshToken.deleteMany();
        await tx.authSession.deleteMany();
        await tx.accountToken.deleteMany();
        await tx.user.deleteMany();
      } else {
        console.log('🛡️ Preserving existing database data (idempotent upsert mode)...');
      }

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
        const item = await tx.skill.upsert({
          where: { normalizedName: s.normalizedName },
          update: { name: s.name },
          create: s,
        });
        skillMap.set(s.normalizedName, item.id);
      }

      // 3. Seed Career Categories
      console.log('📂 Seeding Career Categories...');
      const devCategory = await tx.careerCategory.upsert({
        where: { name: 'Software Development' },
        update: { description: 'Web, mobile, API, and cloud services engineering.' },
        create: {
          name: 'Software Development',
          description: 'Web, mobile, API, and cloud services engineering.',
        },
      });

      const aiCategory = await tx.careerCategory.upsert({
        where: { name: 'Artificial Intelligence & Data' },
        update: {
          description:
            'Machine learning, NLP, data analysis, and AI application engineering.',
        },
        create: {
          name: 'Artificial Intelligence & Data',
          description:
            'Machine learning, NLP, data analysis, and AI application engineering.',
        },
      });

      const cloudCategory = await tx.careerCategory.upsert({
        where: { name: 'Cloud & DevOps' },
        update: {
          description:
            'Cloud infrastructure, CI/CD pipelines, containerization, and system reliability.',
        },
        create: {
          name: 'Cloud & DevOps',
          description:
            'Cloud infrastructure, CI/CD pipelines, containerization, and system reliability.',
        },
      });

      // 4. Seed Admin User
      console.log('👤 Seeding Admin user...');
      const adminUser = await tx.user.upsert({
        where: { email: 'admin@careermatch.local' },
        update: {
          role: UserRole.ADMIN,
          status: AccountStatus.ACTIVE,
        },
        create: {
          email: 'admin@careermatch.local',
          passwordHash: DEFAULT_PASSWORD_HASH,
          role: UserRole.ADMIN,
          status: AccountStatus.ACTIVE,
          emailVerified: new Date(),
        },
      });

      // 5. Seed Companies & Employer Profiles
      console.log('🏢 Seeding Companies & Employers...');
      const techCorp = await tx.company.upsert({
        where: { taxCode: '0312345678' },
        update: {
          name: 'TechCorp Solutions',
          verificationStatus: VerificationStatus.VERIFIED,
        },
        create: {
          name: 'TechCorp Solutions',
          description: 'Enterprise cloud and software modernization consultancy.',
          website: 'https://techcorp.example.com',
          location: 'TP. Hồ Chí Minh',
          taxCode: '0312345678',
          verificationStatus: VerificationStatus.VERIFIED,
          verifiedAt: new Date(),
        },
      });

      const techCorpUser = await tx.user.upsert({
        where: { email: 'recruiter.techcorp@careermatch.local' },
        update: {
          role: UserRole.EMPLOYER,
          status: AccountStatus.ACTIVE,
        },
        create: {
          email: 'recruiter.techcorp@careermatch.local',
          passwordHash: DEFAULT_PASSWORD_HASH,
          role: UserRole.EMPLOYER,
          status: AccountStatus.ACTIVE,
          emailVerified: new Date(),
        },
      });

      await tx.employerProfile.upsert({
        where: { userId: techCorpUser.id },
        update: { companyId: techCorp.id },
        create: {
          userId: techCorpUser.id,
          fullName: 'Sarah Jenkins',
          position: 'Head of Talent Acquisition',
          companyId: techCorp.id,
        },
      });

      const innovateAi = await tx.company.upsert({
        where: { taxCode: '0109876543' },
        update: {
          name: 'InnovateAI Labs',
        },
        create: {
          name: 'InnovateAI Labs',
          description: 'High-growth AI research and developer tools startup.',
          website: 'https://innovateai.example.com',
          location: 'Hà Nội',
          taxCode: '0109876543',
          verificationStatus: VerificationStatus.PENDING,
          verifiedAt: null,
        },
      });

      const innovateAiUser = await tx.user.upsert({
        where: { email: 'talent.innovate@careermatch.local' },
        update: {
          role: UserRole.EMPLOYER,
          status: AccountStatus.ACTIVE,
        },
        create: {
          email: 'talent.innovate@careermatch.local',
          passwordHash: DEFAULT_PASSWORD_HASH,
          role: UserRole.EMPLOYER,
          status: AccountStatus.ACTIVE,
          emailVerified: new Date(),
        },
      });

      await tx.employerProfile.upsert({
        where: { userId: innovateAiUser.id },
        update: { companyId: innovateAi.id },
        create: {
          userId: innovateAiUser.id,
          fullName: 'David Tran',
          position: 'Technical Recruiter',
          companyId: innovateAi.id,
        },
      });

      // 6. Seed Students & Career Profiles
      console.log('🎓 Seeding Students & Career Profiles...');
      const alexUser = await tx.user.upsert({
        where: { email: 'student.alex@careermatch.local' },
        update: {
          role: UserRole.STUDENT,
          status: AccountStatus.ACTIVE,
        },
        create: {
          email: 'student.alex@careermatch.local',
          passwordHash: DEFAULT_PASSWORD_HASH,
          role: UserRole.STUDENT,
          status: AccountStatus.ACTIVE,
          emailVerified: new Date(),
        },
      });

      const alexProfile = await tx.studentProfile.upsert({
        where: { userId: alexUser.id },
        update: { fullName: 'Alex Nguyen' },
        create: {
          userId: alexUser.id,
          fullName: 'Alex Nguyen',
          headline: 'Software Engineering Senior @ HCMUT',
          biography:
            'Enthusiastic backend engineer with hands-on experience in Node.js, Express, and PostgreSQL.',
          careerGoal: 'Backend Developer',
          location: 'TP. Hồ Chí Minh',
          graduationYear: 2026,
        },
      });

      const alexSkills = ['node.js', 'express', 'postgresql', 'git', 'rest api', 'react'];
      for (const sk of alexSkills) {
        const id = skillMap.get(sk);
        if (id) {
          await tx.studentSkill.upsert({
            where: { studentId_skillId: { studentId: alexProfile.id, skillId: id } },
            update: { level: sk === 'node.js' || sk === 'express' ? 4 : 3 },
            create: {
              studentId: alexProfile.id,
              skillId: id,
              level: sk === 'node.js' || sk === 'express' ? 4 : 3,
              source: 'SELF_REPORTED',
            },
          });
        }
      }

      await tx.cv.upsert({
        where: { storageKey: 'cvs/alex_nguyen_2026.pdf' },
        update: {},
        create: {
          studentId: alexProfile.id,
          originalName: 'Alex_Nguyen_CV_2026.pdf',
          storageKey: 'cvs/alex_nguyen_2026.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 154200,
        },
      });

      const baoUser = await tx.user.upsert({
        where: { email: 'student.baole@careermatch.local' },
        update: {
          role: UserRole.STUDENT,
          status: AccountStatus.ACTIVE,
        },
        create: {
          email: 'student.baole@careermatch.local',
          passwordHash: DEFAULT_PASSWORD_HASH,
          role: UserRole.STUDENT,
          status: AccountStatus.ACTIVE,
          emailVerified: new Date(),
        },
      });

      const baoProfile = await tx.studentProfile.upsert({
        where: { userId: baoUser.id },
        update: { fullName: 'Bao Le' },
        create: {
          userId: baoUser.id,
          fullName: 'Bao Le',
          headline: 'Computer Science Senior specializing in Full-stack Web & Cloud',
          biography:
            'Enjoys crafting intuitive user interfaces with React & TypeScript, with foundational backend knowledge.',
          careerGoal: 'Full-stack Developer',
          location: 'Đà Nẵng',
          graduationYear: 2026,
        },
      });

      const baoSkills = ['react', 'typescript', 'tailwind css', 'node.js', 'git', 'docker'];
      for (const sk of baoSkills) {
        const id = skillMap.get(sk);
        if (id) {
          await tx.studentSkill.upsert({
            where: { studentId_skillId: { studentId: baoProfile.id, skillId: id } },
            update: { level: sk === 'react' || sk === 'typescript' ? 4 : 3 },
            create: {
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
      let backendJob = await tx.job.findFirst({
        where: { companyId: techCorp.id, title: 'Backend Developer Intern' },
      });
      if (!backendJob) {
        backendJob = await tx.job.create({
          data: {
            companyId: techCorp.id,
            categoryId: devCategory.id,
            title: 'Backend Developer Intern',
            description:
              'Join our team to develop performant REST APIs using Node.js, Express, and PostgreSQL. Exposure to Docker containerization and NestJS.',
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
      }

      let fullstackJob = await tx.job.findFirst({
        where: { companyId: techCorp.id, title: 'Full-stack Web Developer Trainee' },
      });
      if (!fullstackJob) {
        fullstackJob = await tx.job.create({
          data: {
            companyId: techCorp.id,
            categoryId: devCategory.id,
            title: 'Full-stack Web Developer Trainee',
            description:
              'Exciting trainee position building responsive web interfaces in React & TypeScript paired with Node.js APIs.',
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
      }

      let aiJob = await tx.job.findFirst({
        where: { companyId: innovateAi.id, title: 'AI Engineering Intern' },
      });
      if (!aiJob) {
        aiJob = await tx.job.create({
          data: {
            companyId: innovateAi.id,
            categoryId: aiCategory.id,
            title: 'AI Engineering Intern',
            description:
              'Build backend pipelines using Python and FastAPI. Integrate vector search with pgvector for recommendation algorithms.',
            location: 'Hà Nội',
            workMode: 'Remote',
            status: JobStatus.PENDING_APPROVAL,
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
      }

      let cloudDraftJob = await tx.job.findFirst({
        where: { companyId: techCorp.id, title: 'Junior Cloud Infrastructure Associate' },
      });
      if (!cloudDraftJob) {
        cloudDraftJob = await tx.job.create({
          data: {
            companyId: techCorp.id,
            categoryId: cloudCategory.id,
            title: 'Junior Cloud Infrastructure Associate',
            description: 'Draft job for upcoming cloud migration project.',
            location: 'TP. Hồ Chí Minh',
            workMode: 'On-site',
            status: JobStatus.DRAFT,
            publishedAt: null,
          },
        });
      }

      // 8. Seed AI Match Scores
      console.log('🤖 Seeding AI Match Scores...');
      const existingMatch = await tx.jobMatch.findFirst({
        where: { studentId: alexProfile.id, jobId: backendJob.id },
      });
      if (!existingMatch) {
        await tx.jobMatch.create({
          data: {
            studentId: alexProfile.id,
            jobId: backendJob.id,
            score: 91.0,
            skillScore: 88.0,
            semanticScore: 94.0,
            matchedSkills: ['Node.js', 'Express', 'PostgreSQL', 'Git', 'REST API'],
            missingSkills: ['Docker'],
            explanation:
              'Alex matches 91% of requirements. Strong proficiency in Node.js, Express, and PostgreSQL. Docker is missing for complete alignment.',
            engineVersion: 'rule-based-v1',
          },
        });
      }

      // 9. Seed Applications, History & Interview Lifecycle
      console.log('📝 Seeding Applications & Interview Lifecycle...');
      let alexApp = await tx.application.findFirst({
        where: { studentId: alexProfile.id, jobId: backendJob.id },
      });
      if (!alexApp) {
        alexApp = await tx.application.create({
          data: {
            studentId: alexProfile.id,
            jobId: backendJob.id,
            status: ApplicationStatus.SHORTLISTED,
            coverLetter:
              'I am excited to apply for the Backend Developer Intern position at TechCorp Solutions. My academic and project experience in Node.js matches your tech stack.',
            history: {
              create: [
                {
                  fromStatus: ApplicationStatus.SUBMITTED,
                  toStatus: ApplicationStatus.REVIEWING,
                  changedById: techCorpUser.id,
                  reason: 'Initial profile screening passed.',
                },
                {
                  fromStatus: ApplicationStatus.REVIEWING,
                  toStatus: ApplicationStatus.SHORTLISTED,
                  changedById: techCorpUser.id,
                  reason: 'High technical match score (91%). Moved to shortlist.',
                },
              ],
            },
          },
        });
      }

      let baoApp = await tx.application.findFirst({
        where: { studentId: baoProfile.id, jobId: fullstackJob.id },
      });
      if (!baoApp) {
        baoApp = await tx.application.create({
          data: {
            studentId: baoProfile.id,
            jobId: fullstackJob.id,
            status: ApplicationStatus.INTERVIEW,
            coverLetter:
              'Passionate frontend and web developer applying for the Full-stack Web Developer Trainee program at TechCorp Solutions.',
            history: {
              create: [
                {
                  fromStatus: ApplicationStatus.SUBMITTED,
                  toStatus: ApplicationStatus.SHORTLISTED,
                  changedById: techCorpUser.id,
                  reason: 'Strong React & TypeScript portfolio projects.',
                },
                {
                  fromStatus: ApplicationStatus.SHORTLISTED,
                  toStatus: ApplicationStatus.INTERVIEW,
                  changedById: techCorpUser.id,
                  reason: 'First round technical interview scheduled.',
                },
              ],
            },
          },
        });
      }

      const existingInterview = await tx.interview.findFirst({
        where: { applicationId: baoApp.id },
      });
      if (!existingInterview) {
        await tx.interview.create({
          data: {
            applicationId: baoApp.id,
            scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            durationMin: 45,
            status: InterviewStatus.ACCEPTED,
            meetingUrl: 'https://meet.google.com/abc-careermatch-xyz',
            notes: 'Technical assessment with Lead Frontend Engineer.',
          },
        });
      }

      // 10. Seed Saved Jobs
      console.log('📌 Seeding Saved Jobs for Students...');
      await tx.savedJob.upsert({
        where: { studentId_jobId: { studentId: alexProfile.id, jobId: fullstackJob.id } },
        update: {},
        create: {
          studentId: alexProfile.id,
          jobId: fullstackJob.id,
        },
      });

      await tx.savedJob.upsert({
        where: { studentId_jobId: { studentId: baoProfile.id, jobId: backendJob.id } },
        update: {},
        create: {
          studentId: baoProfile.id,
          jobId: backendJob.id,
        },
      });

      // 11. Seed Audit Logs
      console.log('📋 Seeding Audit Trail...');
      const existingAudit = await tx.auditLog.findFirst({
        where: { entity: 'Company', entityId: techCorp.id, action: 'COMPANY_VERIFIED' },
      });
      if (!existingAudit) {
        await tx.auditLog.createMany({
          data: [
            {
              actorId: adminUser.id,
              action: 'COMPANY_VERIFIED',
              entity: 'Company',
              entityId: techCorp.id,
              metadata: {
                companyName: 'TechCorp Solutions',
                taxCode: '0312345678',
                reason: 'Business license and tax code verified with registry.',
              },
            },
            {
              actorId: techCorpUser.id,
              action: 'JOB_CREATED',
              entity: 'Job',
              entityId: backendJob.id,
              metadata: { title: 'Backend Developer Intern' },
            },
            {
              actorId: adminUser.id,
              action: 'JOB_APPROVED',
              entity: 'Job',
              entityId: backendJob.id,
              metadata: { approvedBy: 'admin@careermatch.local' },
            },
          ],
        });
      }

      // 12. Seed In-app Notifications
      console.log('🔔 Seeding Notifications...');
      const existingNotification = await tx.notification.findFirst({
        where: { userId: techCorpUser.id },
      });
      if (!existingNotification) {
        await tx.notification.createMany({
          data: [
            {
              userId: techCorpUser.id,
              type: NotificationType.COMPANY_VERIFIED,
              title: 'Company Verification Approved',
              body: 'Your company "TechCorp Solutions" has been verified. You can now publish job postings.',
              data: { companyId: techCorp.id },
            },
            {
              userId: techCorpUser.id,
              type: NotificationType.JOB_APPROVED,
              title: 'Job Posting Approved',
              body: 'Your job posting "Backend Developer Intern" has been approved and is now publicly visible.',
              data: { jobId: backendJob.id },
            },
            {
              userId: alexUser.id,
              type: NotificationType.APPLICATION_SHORTLISTED,
              title: 'Application Shortlisted',
              body: 'Your application for Backend Developer Intern has been shortlisted by TechCorp Solutions!',
              data: { jobId: backendJob.id, status: ApplicationStatus.SHORTLISTED },
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
      }
    },
    { timeout: 60000 },
  );

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
