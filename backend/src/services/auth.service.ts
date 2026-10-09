import * as bcrypt from 'bcrypt';
import type { User } from '@prisma/client';
import type { LoginDto, RegisterDto } from '../dto/auth.dto';
import { UserRepository, userRepository } from '../repositories/user.repository';
import type { AuthResponse } from '../types/user.types';
import { AppError } from '../utils/app-error';
import { DuplicateEmailError } from '../utils/duplicate-email-error';
import { generateToken } from '../utils/jwt.util';

export class AuthService {
  constructor(private readonly users: UserRepository = userRepository) {}

  async login(credentials: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmail(credentials.email);
    if (!user || !(await bcrypt.compare(credentials.password, user.password))) {
      throw new AppError('Invalid credentials', 401);
    }
    return this.toAuthResponse(user);
  }

  async register(data: RegisterDto): Promise<AuthResponse> {
    if (await this.users.findByEmail(data.email)) {
      throw new AppError('Email already exists', 400);
    }
    const password = await bcrypt.hash(data.password, 10);
    let user: User;
    try {
      user = await this.users.create({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password,
        admin: false,
      });
    } catch (error: unknown) {
      // Keep the same response if another request just registered this email.
      if (error instanceof DuplicateEmailError) {
        throw new AppError('Email already exists', 400);
      }
      throw error;
    }
    return this.toAuthResponse(user);
  }

  private toAuthResponse(user: User): AuthResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      admin: user.admin,
      token: generateToken(user.id),
    };
  }
}

export const authService = new AuthService();
