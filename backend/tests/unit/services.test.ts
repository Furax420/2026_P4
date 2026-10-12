import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../src/services/auth.service';
import { UserService } from '../../src/services/user.service';
import { TeacherService } from '../../src/services/teacher.service';
import { SessionService } from '../../src/services/session.service';
import { ParticipationService } from '../../src/services/participation.service';
import { UserRepository } from '../../src/repositories/user.repository';
import { TeacherRepository } from '../../src/repositories/teacher.repository';
import { SessionRepository } from '../../src/repositories/session.repository';
import { ParticipationRepository } from '../../src/repositories/participation.repository';
import { DuplicateEmailError } from '../../src/utils/duplicate-email-error';
import { user, teacher, session } from '../helpers';

describe('Business services', (): void => {
  let users: UserRepository; let teachers: TeacherRepository; let sessions: SessionRepository; let participations: ParticipationRepository;
  beforeEach((): void => {
    // Mock repositories to isolate business decisions from the database.
    users = new UserRepository(); teachers = new TeacherRepository(); sessions = new SessionRepository(); participations = new ParticipationRepository();
    vi.spyOn(users, 'findById').mockResolvedValue({ ...user, admin: true });
    vi.spyOn(users, 'findByEmail').mockResolvedValue(null);
    vi.spyOn(users, 'exists').mockResolvedValue(true);
    vi.spyOn(teachers, 'findById').mockResolvedValue(teacher);
    vi.spyOn(sessions, 'exists').mockResolvedValue(true);
    vi.spyOn(sessions, 'findById').mockResolvedValue(session);
  });

  it('rejects an unknown login email', async (): Promise<void> => { await expect(new AuthService(users).login({ email: user.email, password: 'Password!123' })).rejects.toMatchObject({ statusCode: 401 }); });
  it('rejects a wrong password', async (): Promise<void> => {
    vi.mocked(users.findByEmail).mockResolvedValue({ ...user, password: await bcrypt.hash('RightPassword', 4) });
    await expect(new AuthService(users).login({ email: user.email, password: 'WrongPassword' })).rejects.toMatchObject({ statusCode: 401 });
  });
  it('logs in with a valid password and hides the hash', async (): Promise<void> => {
    vi.mocked(users.findByEmail).mockResolvedValue({ ...user, password: await bcrypt.hash('RightPassword', 4) });
    const result = await new AuthService(users).login({ email: user.email, password: 'RightPassword' }); expect(result.token).toBeTruthy(); expect(result).not.toHaveProperty('password');
  });
  it('hashes registration passwords and forces a normal account', async (): Promise<void> => {
    const create = vi.spyOn(users, 'create').mockResolvedValue(user);
    const input = { email: user.email, firstName: user.firstName, lastName: user.lastName, password: 'Password!123' };
    await new AuthService(users).register(input);
    const saved = create.mock.calls[0][0]; expect(saved.admin).toBe(false); expect(saved.password).not.toBe(input.password); expect(await bcrypt.compare(input.password, saved.password)).toBe(true);
  });
  it('rejects an existing registration email', async (): Promise<void> => {
    vi.mocked(users.findByEmail).mockResolvedValue(user); await expect(new AuthService(users).register({ ...user, password: 'Password!123' })).rejects.toMatchObject({ statusCode: 400 });
  });
  it.each([new DuplicateEmailError(), new Error('Database offline')])('handles a registration race or technical failure', async (error): Promise<void> => {
    vi.spyOn(users, 'create').mockRejectedValue(error);
    const result = new AuthService(users).register({ ...user, password: 'Password!123' });
    if (error instanceof DuplicateEmailError) await expect(result).rejects.toMatchObject({ statusCode: 400, message: 'Email already exists' }); else await expect(result).rejects.toBe(error);
  });

  it('returns a public profile', async (): Promise<void> => { const result = await new UserService(users).getById(1); expect(result.id).toBe(1); expect(result).not.toHaveProperty('password'); });
  it('reports an unknown profile', async (): Promise<void> => { vi.mocked(users.findById).mockResolvedValue(null); await expect(new UserService(users).getById(1)).rejects.toMatchObject({ statusCode: 404 }); });
  it.each([undefined, 2])('refuses deletion by another requester: %s', async (requester): Promise<void> => { await expect(new UserService(users).delete(requester, 1)).rejects.toMatchObject({ statusCode: 403 }); });
  it.each([true, false])('handles own-account deletion (exists: %s)', async (exists): Promise<void> => {
    vi.spyOn(users, 'delete').mockResolvedValue(exists); const result = new UserService(users).delete(1, 1);
    if (exists) await expect(result).resolves.toBeUndefined(); else await expect(result).rejects.toMatchObject({ statusCode: 404 });
  });
  it.each(['production', 'test'])('disables promotion in %s', async (mode): Promise<void> => { vi.stubEnv('NODE_ENV', mode); await expect(new UserService(users).promoteSelfToAdmin(1)).rejects.toMatchObject({ statusCode: 403 }); });
  it('requires a requester for development promotion', async (): Promise<void> => { vi.stubEnv('NODE_ENV', 'development'); await expect(new UserService(users).promoteSelfToAdmin(undefined)).rejects.toMatchObject({ statusCode: 401 }); });
  it('reports an unknown promotion user', async (): Promise<void> => { vi.stubEnv('NODE_ENV', 'development'); vi.mocked(users.findById).mockResolvedValue(null); await expect(new UserService(users).promoteSelfToAdmin(1)).rejects.toMatchObject({ statusCode: 404 }); });
  it.each([true, false])('promotes once or preserves an admin (already admin: %s)', async (admin): Promise<void> => {
    vi.stubEnv('NODE_ENV', 'development'); vi.mocked(users.findById).mockResolvedValue({ ...user, admin }); const promote = vi.spyOn(users, 'promoteToAdmin').mockResolvedValue({ ...user, admin: true });
    expect((await new UserService(users).promoteSelfToAdmin(1)).admin).toBe(true); expect(promote).toHaveBeenCalledTimes(admin ? 0 : 1);
  });

  it('lists teachers', async (): Promise<void> => { vi.spyOn(teachers, 'findAll').mockResolvedValue([teacher]); expect(await new TeacherService(teachers).getAll()).toEqual([teacher]); });
  it('reports an unknown teacher', async (): Promise<void> => { vi.mocked(teachers.findById).mockResolvedValue(null); await expect(new TeacherService(teachers).getById(1)).rejects.toMatchObject({ statusCode: 404 }); });
  it('returns an existing teacher', async (): Promise<void> => { expect(await new TeacherService(teachers).getById(1)).toEqual(teacher); });

  const data = { name: 'Yoga practice', date: '2026-10-12', description: 'Relaxing practice', teacherId: 1 };
  it('maps session lists to public responses', async (): Promise<void> => {
    vi.spyOn(sessions, 'findAll').mockResolvedValue([{ ...session, participants: [{ sessionId: 1, userId: 4 }] }]);
    const result = await new SessionService(sessions, users, teachers).getAll(); expect(result[0].users).toEqual([4]); expect(result[0].teacher).not.toHaveProperty('createdAt');
  });
  it('returns an existing session', async (): Promise<void> => { expect((await new SessionService(sessions, users, teachers).getById(1)).id).toBe(1); });
  it('reports an unknown session', async (): Promise<void> => { vi.mocked(sessions.findById).mockResolvedValue(null); await expect(new SessionService(sessions, users, teachers).getById(1)).rejects.toMatchObject({ statusCode: 404 }); });
  it.each([undefined, null, false])('refuses session creation without admin rights: %s', async (role): Promise<void> => {
    if (role === null) vi.mocked(users.findById).mockResolvedValue(null); else if (role === false) vi.mocked(users.findById).mockResolvedValue(user);
    await expect(new SessionService(sessions, users, teachers).create(role === undefined ? undefined : 1, data)).rejects.toMatchObject({ statusCode: 403 });
  });
  it('requires an existing teacher', async (): Promise<void> => { vi.mocked(teachers.findById).mockResolvedValue(null); await expect(new SessionService(sessions, users, teachers).create(1, data)).rejects.toMatchObject({ statusCode: 404 }); });
  it('converts a valid date before repository creation', async (): Promise<void> => { const create = vi.spyOn(sessions, 'create').mockResolvedValue(session); await new SessionService(sessions, users, teachers).create(1, data); expect(create).toHaveBeenCalledWith({ ...data, date: new Date(data.date) }); });
  it('passes only the supplied update fields', async (): Promise<void> => { const update = vi.spyOn(sessions, 'update').mockResolvedValue(session); await new SessionService(sessions, users, teachers).update(1, 1, { name: 'Changed', date: data.date, description: 'Updated', teacherId: 1 }); expect(update).toHaveBeenCalledWith(1, { name: 'Changed', date: new Date(data.date), description: 'Updated', teacherId: 1 }); });
  it('allows an empty partial update', async (): Promise<void> => { const update = vi.spyOn(sessions, 'update').mockResolvedValue(session); await new SessionService(sessions, users, teachers).update(1, 1, {}); expect(update).toHaveBeenCalledWith(1, {}); });
  it('handles a session missing before update', async (): Promise<void> => { vi.mocked(sessions.exists).mockResolvedValue(false); await expect(new SessionService(sessions, users, teachers).update(1, 1, {})).rejects.toMatchObject({ statusCode: 404 }); });
  it('handles a session deleted during update', async (): Promise<void> => { vi.spyOn(sessions, 'update').mockResolvedValue(null); await expect(new SessionService(sessions, users, teachers).update(1, 1, {})).rejects.toMatchObject({ statusCode: 404 }); });
  it.each([true, false])('handles session deletion (exists: %s)', async (exists): Promise<void> => { vi.spyOn(sessions, 'delete').mockResolvedValue(exists); const result = new SessionService(sessions, users, teachers).delete(1, 1); if (exists) await expect(result).resolves.toBeUndefined(); else await expect(result).rejects.toMatchObject({ statusCode: 404 }); });

  it('joins an existing session', async (): Promise<void> => { vi.spyOn(participations, 'create').mockResolvedValue(true); await expect(new ParticipationService(sessions, users, participations).participate(1, 1)).resolves.toBeUndefined(); });
  it('refuses joining a missing session', async (): Promise<void> => { vi.mocked(sessions.exists).mockResolvedValue(false); await expect(new ParticipationService(sessions, users, participations).participate(1, 1)).rejects.toMatchObject({ statusCode: 404 }); });
  it('refuses joining with a missing user', async (): Promise<void> => { vi.mocked(users.exists).mockResolvedValue(false); await expect(new ParticipationService(sessions, users, participations).participate(1, 1)).rejects.toMatchObject({ statusCode: 404 }); });
  it('refuses duplicate participation', async (): Promise<void> => { vi.spyOn(participations, 'create').mockResolvedValue(false); await expect(new ParticipationService(sessions, users, participations).participate(1, 1)).rejects.toMatchObject({ statusCode: 400 }); });
  it.each([true, false])('handles leaving (participating: %s)', async (exists): Promise<void> => { vi.spyOn(participations, 'delete').mockResolvedValue(exists); const result = new ParticipationService(sessions, users, participations).unparticipate(1, 1); if (exists) await expect(result).resolves.toBeUndefined(); else await expect(result).rejects.toMatchObject({ statusCode: 404 }); });
});
