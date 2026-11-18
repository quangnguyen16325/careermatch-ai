import { OwnershipService } from './ownership.service.js';
import { DatabaseService } from '../database/database.service.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

describe('ownership scoping', () => {
  const cvId = '00000000-0000-4000-8000-000000000001';
  const analysisId = '00000000-0000-4000-8000-000000000002';
  const user: AuthenticatedUser = {
    id: '00000000-0000-4000-8000-000000000003',
    email: 'a@example.com',
    role: 'STUDENT',
    status: 'ACTIVE',
  };
  const profile = vi.fn(),
    cv = vi.fn(),
    analysis = vi.fn();
  const database = {
    client: {
      studentProfile: { findUnique: profile },
      cv: { findFirst: cv },
      cvAnalysis: { findFirst: analysis },
    },
  } as unknown as DatabaseService;
  let service: OwnershipService;
  beforeEach(() => {
    vi.resetAllMocks();
    service = new OwnershipService(database);
  });
  it('resolves the profile by authenticated User ID, not caller-supplied profile IDs', async () => {
    profile.mockResolvedValue({ id: 'profile' });
    expect(await service.studentProfile(user)).toEqual({ id: 'profile' });
    expect(profile).toHaveBeenCalledWith({
      where: { userId: user.id },
      select: { id: true },
    });
  });
  it('scopes CV lookup to its owner and selects no storageKey', async () => {
    cv.mockResolvedValue({ id: cvId });
    await service.cv(user, cvId);
    const args = cv.mock.calls[0][0];
    expect(args.where).toEqual({ id: cvId, student: { userId: user.id } });
    expect(args.select.storageKey).toBeUndefined();
  });
  it('checks the analysis, supplied CV and owner in the same query', async () => {
    analysis.mockResolvedValue({ id: analysisId });
    await service.analysis(user, cvId, analysisId);
    expect(analysis.mock.calls[0][0].where).toEqual({
      id: analysisId,
      cvId,
      cv: { student: { userId: user.id } },
    });
  });
  it('hides missing/foreign/malformed resources behind the same 404', async () => {
    cv.mockResolvedValue(null);
    analysis.mockResolvedValue(null);
    profile.mockResolvedValue(null);
    for (const op of [
      () => service.cv(user, cvId),
      () => service.cv(user, 'bad'),
      () => service.analysis(user, cvId, analysisId),
      () => service.studentProfile(user),
    ]) {
      await expect(op()).rejects.toMatchObject({
        status: 404,
        response: { code: 'RESOURCE_NOT_FOUND' },
      });
    }
  });
  it.each(['EMPLOYER', 'ADMIN'] as const)(
    'does not grant %s implicit access to student CVs',
    async (role) => {
      await expect(service.cv({ ...user, role }, cvId)).rejects.toMatchObject({
        status: 403,
      });
      expect(cv).not.toHaveBeenCalled();
    },
  );
});
