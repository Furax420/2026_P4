import { SessionRepository, sessionRepository } from '../repositories/session.repository';
import { UserRepository, userRepository } from '../repositories/user.repository';
import { ParticipationRepository, participationRepository } from '../repositories/participation.repository';
import { AppError } from '../utils/app-error';

export class ParticipationService {
  constructor(
    private readonly sessions: SessionRepository = sessionRepository,
    private readonly users: UserRepository = userRepository,
    private readonly participations: ParticipationRepository = participationRepository,
  ) {}

  async participate(requesterId: number | undefined, sessionId: number, userId: number): Promise<void> {
    this.requireOwner(requesterId, userId);
    if (!(await this.sessions.exists(sessionId))) throw new AppError('Session not found', 404);
    if (!(await this.users.exists(userId))) throw new AppError('User not found', 404);
    if (!(await this.participations.create(sessionId, userId))) {
      throw new AppError('User already participating in this session', 400);
    }
  }

  async unparticipate(requesterId: number | undefined, sessionId: number, userId: number): Promise<void> {
    this.requireOwner(requesterId, userId);
    if (!(await this.participations.delete(sessionId, userId))) {
      throw new AppError('Participation not found', 404);
    }
  }

  private requireOwner(requesterId: number | undefined, userId: number): void {
    // Check the authenticated user before reading or changing participation data.
    if (requesterId !== userId) {
      throw new AppError('You can only manage your own participation', 403);
    }
  }
}

export const participationService = new ParticipationService();
