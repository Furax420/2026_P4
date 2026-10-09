import type { Request, Response } from 'express';
import { LoginSchema, RegisterSchema } from '../dto/auth.dto';
import { AuthService, authService } from '../services/auth.service';
import { parseInput } from '../utils/parse-input';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  async login(req: Request, res: Response): Promise<void> {
    const credentials = parseInput(LoginSchema, req.body);
    res.status(200).json(await this.service.login(credentials));
  }

  async register(req: Request, res: Response): Promise<void> {
    const data = parseInput(RegisterSchema, req.body);
    res.status(201).json(await this.service.register(data));
  }
}
