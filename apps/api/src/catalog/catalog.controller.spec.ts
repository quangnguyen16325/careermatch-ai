import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CategoriesController } from './categories.controller.js';
import { SkillsController } from './skills.controller.js';
import { AdminCatalogController } from './admin-catalog.controller.js';
import { CatalogService } from './catalog.service.js';
import { UserRole } from '../generated/prisma/enums.js';

describe('Catalog Controllers', () => {
  let categoriesController: CategoriesController;
  let skillsController: SkillsController;
  let adminCatalogController: AdminCatalogController;
  let service: {
    findAllCategories: ReturnType<typeof vi.fn>;
    getCategoryById: ReturnType<typeof vi.fn>;
    createCategory: ReturnType<typeof vi.fn>;
    updateCategory: ReturnType<typeof vi.fn>;
    deleteCategory: ReturnType<typeof vi.fn>;
    findAllSkills: ReturnType<typeof vi.fn>;
    createSkill: ReturnType<typeof vi.fn>;
  };

  const mockAdmin = {
    id: 'admin-1',
    email: 'admin@careermatch.local',
    role: UserRole.ADMIN,
    status: 'ACTIVE' as const,
  };

  beforeEach(() => {
    service = {
      findAllCategories: vi.fn(),
      getCategoryById: vi.fn(),
      createCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
      findAllSkills: vi.fn(),
      createSkill: vi.fn(),
    };

    categoriesController = new CategoriesController(
      service as unknown as CatalogService,
    );
    skillsController = new SkillsController(
      service as unknown as CatalogService,
    );
    adminCatalogController = new AdminCatalogController(
      service as unknown as CatalogService,
    );
  });

  describe('CategoriesController', () => {
    it('delegates findAllCategories to service', async () => {
      service.findAllCategories.mockResolvedValue([]);
      const result = await categoriesController.findAll();
      expect(service.findAllCategories).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('delegates getById to service', async () => {
      service.getCategoryById.mockResolvedValue({ id: 'cat-1' });
      const result = await categoriesController.getById('cat-1');
      expect(service.getCategoryById).toHaveBeenCalledWith('cat-1');
      expect(result).toEqual({ id: 'cat-1' });
    });
  });

  describe('SkillsController', () => {
    it('delegates findAll to service with query', async () => {
      service.findAllSkills.mockResolvedValue([]);
      const result = await skillsController.findAll({ search: 'react' });
      expect(service.findAllSkills).toHaveBeenCalledWith({ search: 'react' });
      expect(result).toEqual([]);
    });
  });

  describe('AdminCatalogController', () => {
    it('delegates createCategory to service', async () => {
      const dto = { name: 'AI Engineering' };
      service.createCategory.mockResolvedValue({ id: 'cat-1', ...dto });

      const result = await adminCatalogController.createCategory(mockAdmin, dto);

      expect(service.createCategory).toHaveBeenCalledWith(mockAdmin.id, dto);
      expect(result).toEqual({ id: 'cat-1', ...dto });
    });

    it('delegates updateCategory to service', async () => {
      const dto = { name: 'Updated AI' };
      service.updateCategory.mockResolvedValue({ id: 'cat-1', ...dto });

      const result = await adminCatalogController.updateCategory(
        mockAdmin,
        'cat-1',
        dto,
      );

      expect(service.updateCategory).toHaveBeenCalledWith(
        mockAdmin.id,
        'cat-1',
        dto,
      );
      expect(result).toEqual({ id: 'cat-1', ...dto });
    });

    it('delegates deleteCategory to service', async () => {
      service.deleteCategory.mockResolvedValue({ success: true });

      const result = await adminCatalogController.deleteCategory(
        mockAdmin,
        'cat-1',
      );

      expect(service.deleteCategory).toHaveBeenCalledWith(mockAdmin.id, 'cat-1');
      expect(result).toEqual({ success: true });
    });

    it('delegates createSkill to service', async () => {
      const dto = { name: 'GraphQL' };
      service.createSkill.mockResolvedValue({ id: 's-1', ...dto });

      const result = await adminCatalogController.createSkill(mockAdmin, dto);

      expect(service.createSkill).toHaveBeenCalledWith(mockAdmin.id, dto);
      expect(result).toEqual({ id: 's-1', ...dto });
    });
  });
});
