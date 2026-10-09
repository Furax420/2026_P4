import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware';
import { CreateSessionSchema, UpdateSessionSchema } from '../dto/session.dto';
import { SessionIdSchema, UserIdSchema } from '../dto/identifier.dto';
import { SessionService, sessionService } from '../services/session.service';
import { ParticipationService, participationService } from '../services/participation.service';
import { parseInput } from '../utils/parse-input';

export class SessionController {
  constructor(
    private readonly sessions: SessionService = sessionService,
    private readonly participations: ParticipationService = participationService,
  ) {}

  async getAll(_req: AuthRequest, res: Response): Promise<void> {
    res.status(200).json(await this.sessions.getAll());
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInput(SessionIdSchema, req.params.id);
    res.status(200).json(await this.sessions.getById(id));
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    const data = parseInput(CreateSessionSchema, req.body);
    res.status(201).json(await this.sessions.create(req.userId, data));
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInput(SessionIdSchema, req.params.id);
    const data = parseInput(UpdateSessionSchema, req.body);
    res.status(200).json(await this.sessions.update(req.userId, id, data));
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInput(SessionIdSchema, req.params.id);
    await this.sessions.delete(req.userId, id);
    res.status(200).json({ message: 'Session deleted successfully' });
  }

  async participate(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInput(SessionIdSchema, req.params.id);
    const userId = parseInput(UserIdSchema, req.params.userId);
    await this.participations.participate(id, userId);
    res.status(200).json({ message: 'Successfully joined the session' });
  }

  async unparticipate(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInput(SessionIdSchema, req.params.id);
    const userId = parseInput(UserIdSchema, req.params.userId);
    await this.participations.unparticipate(id, userId);
    res.status(200).json({ message: 'Successfully left the session' });
  }
}
