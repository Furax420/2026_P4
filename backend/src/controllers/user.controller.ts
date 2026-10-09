import type { Response } from 'express';
import { UserIdSchema } from '../dto/identifier.dto';
import type { AuthRequest } from '../middleware/auth.middleware';
import { UserService, userService } from '../services/user.service';
import { parseInput } from '../utils/parse-input';

export class UserController {
  constructor(private readonly service: UserService = userService) {}

  async getById(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInput(UserIdSchema, req.params.id);
    res.status(200).json(await this.service.getById(id));
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInput(UserIdSchema, req.params.id);
    await this.service.delete(req.userId, id);
    res.status(200).json({ message: 'User deleted successfully' });
  }

  async promoteSelfToAdmin(req: AuthRequest, res: Response): Promise<void> {
    res.status(200).json(await this.service.promoteSelfToAdmin(req.userId));
  }
}
