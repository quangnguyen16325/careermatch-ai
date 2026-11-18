import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CatalogService } from './catalog.service.js';
import { DatabaseService } from '../database/database.service.js';

describe('CatalogService', () => {
  let service: CatalogService;
  let mockDb: {
    client: {
      careerCategory: {
        findMany: ReturnType<typeof vi.fn>;
        findUnique: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
      };
      skill: {
        findMany: ReturnType<typeof vi.fn>;
        findFirst: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
      };
      auditLog: {
        create: ReturnType<typeof vi.fn>;
      };
      $transaction: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockDb = {
      client: {
        careerCategory: {
          findMany: vi.fn(),
          findUnique: vi.fn(),
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        skill: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
          create: vi.fn(),
        },
        auditLog: {
          create: vi.fn(),
        },
        $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
          cb(mockDb.client),
        ),
      },
    };

    service = new CatalogService(mockDb as unknown as DatabaseService);
  });

  describe('findAllCategories', () => {
    it('returns all categories ordered by name', async () => {
      mockDb.client.careerCategory.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Software Engineering', _count: { jobs: 5 } },
      ]);

      const result = await service.findAllCategories();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Software Engineering');
    });
  });

  describe('getCategoryById', () => {
    it('throws NotFoundException when category does not exist', async () => {
      mockDb.client.careerCategory.findUnique.mockResolvedValue(null);

      await expect(service.getCategoryById('cat-unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns category details by id', async () => {
      const category = { id: 'cat-1', name: 'Design' };
      mockDb.client.careerCategory.findUnique.mockResolvedValue(category);

      const result = await service.getCategoryById('cat-1');
      expect(result).toEqual(category);
    });
  });

  describe('createCategory', () => {
    it('throws ConflictException when name is duplicate', async () => {
      mockDb.client.careerCategory.findFirst.mockResolvedValue({
        id: 'cat-1',
        name: 'Design',
      });

      await expect(
        service.createCategory('admin-1', { name: 'design' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates category and logs audit', async () => {
      mockDb.client.careerCategory.findFirst.mockResolvedValue(null);
      mockDb.client.careerCategory.create.mockResolvedValue({
        id: 'cat-1',
        name: 'Design',
        description: 'UI/UX design',
      });

      const result = await service.createCategory('admin-1', {
        name: 'Design',
        description: 'UI/UX design',
      });

      expect(result.id).toBe('cat-1');
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'admin-1',
          action: 'CATEGORY_CREATED',
          entity: 'CareerCategory',
          entityId: 'cat-1',
        }),
      });
    });
  });

  describe('updateCategory', () => {
    it('throws NotFoundException when category not found', async () => {
      mockDb.client.careerCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCategory('admin-1', 'cat-unknown', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when renaming to existing category name', async () => {
      mockDb.client.careerCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Old',
      });
      mockDb.client.careerCategory.findFirst.mockResolvedValue({
        id: 'cat-2',
        name: 'Existing',
      });

      await expect(
        service.updateCategory('admin-1', 'cat-1', { name: 'Existing' }),
      ).rejects.toThrow(ConflictException);
    });

    it('updates category and logs audit', async () => {
      mockDb.client.careerCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Old',
      });
      mockDb.client.careerCategory.findFirst.mockResolvedValue(null);
      mockDb.client.careerCategory.update.mockResolvedValue({
        id: 'cat-1',
        name: 'Updated Name',
      });

      const result = await service.updateCategory('admin-1', 'cat-1', {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CATEGORY_UPDATED',
          entityId: 'cat-1',
        }),
      });
    });
  });

  describe('deleteCategory', () => {
    it('throws NotFoundException when category does not exist', async () => {
      mockDb.client.careerCategory.findUnique.mockResolvedValue(null);

      await expect(service.deleteCategory('admin-1', 'cat-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when category has associated jobs', async () => {
      mockDb.client.careerCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        _count: { jobs: 3 },
      });

      await expect(service.deleteCategory('admin-1', 'cat-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deletes category and logs audit', async () => {
      mockDb.client.careerCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Empty Category',
        _count: { jobs: 0 },
      });

      const result = await service.deleteCategory('admin-1', 'cat-1');

      expect(result.success).toBe(true);
      expect(mockDb.client.careerCategory.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CATEGORY_DELETED',
          entityId: 'cat-1',
        }),
      });
    });
  });

  describe('skills', () => {
    it('finds skills matching search term', async () => {
      mockDb.client.skill.findMany.mockResolvedValue([
        { id: 's-1', name: 'TypeScript' },
      ]);

      const result = await service.findAllSkills({ search: 'type', limit: 10 });
      expect(result).toHaveLength(1);
    });

    it('throws ConflictException if skill name already exists', async () => {
      mockDb.client.skill.findFirst.mockResolvedValue({
        id: 's-1',
        name: 'Docker',
        normalizedName: 'docker',
      });

      await expect(
        service.createSkill('admin-1', { name: 'Docker' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates skill with normalized name and logs audit', async () => {
      mockDb.client.skill.findFirst.mockResolvedValue(null);
      mockDb.client.skill.create.mockResolvedValue({
        id: 's-2',
        name: 'PostgreSQL',
        normalizedName: 'postgresql',
      });

      const result = await service.createSkill('admin-1', {
        name: 'PostgreSQL',
      });

      expect(result.id).toBe('s-2');
      expect(mockDb.client.skill.create).toHaveBeenCalledWith({
        data: {
          name: 'PostgreSQL',
          normalizedName: 'postgresql',
        },
      });
      expect(mockDb.client.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SKILL_CREATED',
          entityId: 's-2',
        }),
      });
    });
  });
});
