import type { Response } from 'express';
import { TeacherIdSchema } from '../dto/identifier.dto';
import type { AuthRequest } from '../middleware/auth.middleware';
import { TeacherService, teacherService } from '../services/teacher.service';
import { parseInput } from '../utils/parse-input';

export class TeacherController {
  constructor(private readonly service: TeacherService = teacherService) {}

  async getAll(_req: AuthRequest, res: Response): Promise<void> {
    res.status(200).json(await this.service.getAll());
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    const id = parseInput(TeacherIdSchema, req.params.id);
    res.status(200).json(await this.service.getById(id));
  }
}
