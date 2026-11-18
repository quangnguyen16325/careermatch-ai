import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

@Injectable()
export class OwnershipService {
  constructor(private readonly db: DatabaseService) {}

  private student(user: AuthenticatedUser) {
    if (!user)
      throw new UnauthorizedException({ code: 'AUTHENTICATION_REQUIRED' });
    if (user.status !== 'ACTIVE' || user.role !== 'STUDENT')
      throw new ForbiddenException({ code: 'FORBIDDEN' });
  }
  private notFound(): never {
    throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND' });
  }

  async studentProfile(user: AuthenticatedUser) {
    this.student(user);
    const profile = await this.db.client.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!profile) this.notFound();
    return profile;
  }

  async cv(user: AuthenticatedUser, cvId: string) {
    this.student(user);
    if (!uuid.test(cvId)) this.notFound();
    const cv = await this.db.client.cv.findFirst({
      where: { id: cvId, student: { userId: user.id } },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });
    if (!cv) this.notFound();
    return cv; // Metadata only; storageKey must not accidentally enter JSON.
  }

  async analysis(user: AuthenticatedUser, cvId: string, analysisId: string) {
    this.student(user);
    if (!uuid.test(cvId) || !uuid.test(analysisId)) this.notFound();
    const analysis = await this.db.client.cvAnalysis.findFirst({
      where: { id: analysisId, cvId, cv: { student: { userId: user.id } } },
      select: { id: true, cvId: true, status: true },
    });
    if (!analysis) this.notFound();
    return analysis;
  }
}
