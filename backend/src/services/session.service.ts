import type { CreateSessionDto, UpdateSessionDto } from '../dto/session.dto';
import { SessionRepository, sessionRepository } from '../repositories/session.repository';
import { UserRepository, userRepository } from '../repositories/user.repository';
import { TeacherRepository, teacherRepository } from '../repositories/teacher.repository';
import type { SessionResponse, SessionUpdateData } from '../types/session.types';
import { AppError } from '../utils/app-error';
import { toSessionResponse } from './session.mapper';

export class SessionService {
  constructor(
    private readonly sessions: SessionRepository = sessionRepository,
    private readonly users: UserRepository = userRepository,
    private readonly teachers: TeacherRepository = teacherRepository,
  ) {}

  async getAll(): Promise<SessionResponse[]> {
    const sessions = await this.sessions.findAll();
    return sessions.map(toSessionResponse);
  }

  async getById(id: number): Promise<SessionResponse> {
    const session = await this.sessions.findById(id);
    if (!session) throw new AppError('Session not found', 404);
    return toSessionResponse(session);
  }

  async create(requesterId: number | undefined, data: CreateSessionDto): Promise<SessionResponse> {
    await this.requireAdmin(requesterId);
    await this.requireTeacher(data.teacherId);
    const session = await this.sessions.create({ ...data, date: new Date(data.date) });
    return toSessionResponse(session);
  }

  async update(requesterId: number | undefined, id: number, data: UpdateSessionDto): Promise<SessionResponse> {
    await this.requireAdmin(requesterId);
    if (!(await this.sessions.exists(id))) throw new AppError('Session not found', 404);

    const changes: SessionUpdateData = {};
    if (data.name !== undefined) changes.name = data.name;
    if (data.date !== undefined) changes.date = new Date(data.date);
    if (data.description !== undefined) changes.description = data.description;
    if (data.teacherId !== undefined) {
      await this.requireTeacher(data.teacherId);
      changes.teacherId = data.teacherId;
    }
    const session = await this.sessions.update(id, changes);
    if (!session) throw new AppError('Session not found', 404);
    return toSessionResponse(session);
  }

  async delete(requesterId: number | undefined, id: number): Promise<void> {
    await this.requireAdmin(requesterId);
    if (!(await this.sessions.delete(id))) throw new AppError('Session not found', 404);
  }

  private async requireAdmin(userId: number | undefined): Promise<void> {
    if (userId === undefined) throw new AppError('Admin access required', 403);
    const user = await this.users.findById(userId);
    if (!user?.admin) throw new AppError('Admin access required', 403);
  }

  private async requireTeacher(id: number): Promise<void> {
    if (!(await this.teachers.findById(id))) throw new AppError('Teacher not found', 404);
  }
}

export const sessionService = new SessionService();
