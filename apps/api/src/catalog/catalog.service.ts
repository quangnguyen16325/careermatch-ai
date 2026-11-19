import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { DatabaseService } from '../database/database.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CreateSkillDto } from './dto/create-skill.dto.js';
import { QuerySkillDto } from './dto/query-skill.dto.js';

@Injectable()
export class CatalogService {
  constructor(private readonly db: DatabaseService) {}

  async findAllCategories() {
    return this.db.client.careerCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { jobs: true },
        },
      },
    });
  }

  async getCategoryById(id: string) {
    const category = await this.db.client.careerCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { jobs: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Career category not found',
      });
    }

    return category;
  }

  async createCategory(adminUserId: string, dto: CreateCategoryDto) {
    const existing = await this.db.client.careerCategory.findFirst({
      where: {
        name: { equals: dto.name, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'CATEGORY_NAME_EXISTS',
        message: 'A category with this name already exists',
      });
    }

    return this.db.client.$transaction(async (tx) => {
      const category = await tx.careerCategory.create({
        data: {
          name: dto.name,
          description: dto.description,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminUserId,
          action: 'CATEGORY_CREATED',
          entity: 'CareerCategory',
          entityId: category.id,
          metadata: { name: category.name },
        },
      });

      return category;
    });
  }

  async updateCategory(
    adminUserId: string,
    id: string,
    dto: UpdateCategoryDto,
  ) {
    const category = await this.db.client.careerCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Career category not found',
      });
    }

    if (dto.name && dto.name.toLowerCase() !== category.name.toLowerCase()) {
      const existing = await this.db.client.careerCategory.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException({
          code: 'CATEGORY_NAME_EXISTS',
          message: 'A category with this name already exists',
        });
      }
    }

    return this.db.client.$transaction(async (tx) => {
      const updated = await tx.careerCategory.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminUserId,
          action: 'CATEGORY_UPDATED',
          entity: 'CareerCategory',
          entityId: id,
          metadata: {
            changes: JSON.parse(JSON.stringify(dto)) as Prisma.InputJsonValue,
          },
        },
      });

      return updated;
    });
  }

  async deleteCategory(adminUserId: string, id: string) {
    const category = await this.db.client.careerCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { jobs: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException({
        code: 'CATEGORY_NOT_FOUND',
        message: 'Career category not found',
      });
    }

    if (category._count.jobs > 0) {
      throw new BadRequestException({
        code: 'CATEGORY_IN_USE',
        message: 'Cannot delete category that is assigned to existing jobs',
      });
    }

    return this.db.client.$transaction(async (tx) => {
      await tx.careerCategory.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminUserId,
          action: 'CATEGORY_DELETED',
          entity: 'CareerCategory',
          entityId: id,
          metadata: { name: category.name },
        },
      });

      return {
        success: true,
        message: 'Category deleted successfully',
      };
    });
  }

  async findAllSkills(query: QuerySkillDto) {
    const limit = Math.min(query.limit ?? 20, 100);
    const where = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' as const } },
            {
              normalizedName: {
                contains: query.search.toLowerCase(),
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : {};

    return this.db.client.skill.findMany({
      where,
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  async createSkill(adminUserId: string, dto: CreateSkillDto) {
    const normalizedName = dto.name.trim().toLowerCase();

    const existing = await this.db.client.skill.findFirst({
      where: {
        OR: [
          { name: { equals: dto.name, mode: 'insensitive' } },
          { normalizedName },
        ],
      },
    });

    if (existing) {
      throw new ConflictException({
        code: 'SKILL_NAME_EXISTS',
        message: 'A skill with this name already exists',
      });
    }

    return this.db.client.$transaction(async (tx) => {
      const skill = await tx.skill.create({
        data: {
          name: dto.name,
          normalizedName,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: adminUserId,
          action: 'SKILL_CREATED',
          entity: 'Skill',
          entityId: skill.id,
          metadata: { name: skill.name },
        },
      });

      return skill;
    });
  }
}
