import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Prisma } from '../src/generated/prisma/client.js';

describe('Recruitment & Notification Schema Validation (CM-082)', () => {
  const schemaPath = fileURLToPath(
    new URL('../prisma/schema.prisma', import.meta.url),
  );
  const schemaContent = readFileSync(schemaPath, 'utf-8');

  const getModelBlock = (modelName: string): string => {
    const match = schemaContent.match(
      new RegExp(`model\\s+${modelName}\\s+\\{([\\s\\S]*?)\\}`, 'm'),
    );
    if (!match) throw new Error(`Model ${modelName} not found in schema.prisma`);
    return match[1];
  };

  it('exposes all recruitment domain models in Prisma Client', () => {
    const expectedModels: (keyof typeof Prisma.ModelName)[] = [
      'Company',
      'EmployerProfile',
      'CareerCategory',
      'Job',
      'JobSkill',
      'SavedJob',
      'JobMatch',
      'Application',
      'ApplicationStatusHistory',
      'Interview',
      'Notification',
      'Report',
      'AuditLog',
    ];

    for (const name of expectedModels) {
      expect(Prisma.ModelName[name]).toBe(name);
    }
  });

  describe('Company Model', () => {
    it('defines taxCode with unique constraint and verificationStatus enum', () => {
      const block = getModelBlock('Company');
      expect(block).toMatch(/taxCode\s+String\?\s+@unique/);
      expect(
        block,
      ).toMatch(/verificationStatus\s+VerificationStatus\s+@default\(PENDING\)/);
    });
  });

  describe('Job Model', () => {
    it('defines compound indexes for catalog and employer queries', () => {
      const block = getModelBlock('Job');
      expect(block).toMatch(/@@index\(\[status,\s*publishedAt\]\)/);
      expect(block).toMatch(/@@index\(\[companyId,\s*status\]\)/);
    });

    it('cascades deletion to JobSkill but restricts onDelete from Company', () => {
      const block = getModelBlock('Job');
      expect(
        block,
      ).toMatch(/company\s+Company\s+@relation\(fields:\s*\[companyId\],\s*references:\s*\[id\]\)/);
    });
  });

  describe('Application Model', () => {
    it('enforces unique constraint [studentId, jobId] preventing duplicate applications', () => {
      const block = getModelBlock('Application');
      expect(block).toMatch(/@@unique\(\[studentId,\s*jobId\]\)/);
    });

    it('defines @@index([jobId, status]) for applicant tracking', () => {
      const block = getModelBlock('Application');
      expect(block).toMatch(/@@index\(\[jobId,\s*status\]\)/);
    });

    it('tracks append-only history and scheduled interviews with cascade delete', () => {
      const block = getModelBlock('Application');
      expect(block).toMatch(/history\s+ApplicationStatusHistory\[\]/);
      expect(block).toMatch(/interviews\s+Interview\[\]/);
    });
  });

  describe('JobMatch Model', () => {
    it('enforces composite unique constraint on student, job, and algorithm version', () => {
      const block = getModelBlock('JobMatch');
      expect(
        block,
      ).toMatch(/@@unique\(\[studentId,\s*jobId,\s*engineVersion\]\)/);
    });

    it('indexes [jobId, score] and [studentId, score] for instant ranking', () => {
      const block = getModelBlock('JobMatch');
      expect(block).toMatch(/@@index\(\[jobId,\s*score\]\)/);
      expect(block).toMatch(/@@index\(\[studentId,\s*score\]\)/);
    });
  });

  describe('Notification Model', () => {
    it('indexes [userId, readAt, createdAt] for unread badges and inbox pagination', () => {
      const block = getModelBlock('Notification');
      expect(block).toMatch(/@@index\(\[userId,\s*readAt,\s*createdAt\]\)/);
    });
  });

  describe('AuditLog Model', () => {
    it('defines compound indexes on target entity and actor activity', () => {
      const block = getModelBlock('AuditLog');
      expect(block).toMatch(/@@index\(\[entity,\s*entityId\]\)/);
      expect(block).toMatch(/@@index\(\[actorId,\s*createdAt\]\)/);
    });
  });
});
