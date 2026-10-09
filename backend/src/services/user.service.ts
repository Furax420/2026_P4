import { UserRepository, userRepository } from '../repositories/user.repository';
import type { UserProfile } from '../types/user.types';
import { AppError } from '../utils/app-error';
import { toUserProfile } from './user.mapper';

export class UserService {
  constructor(private readonly users: UserRepository = userRepository) {}

  async getById(id: number): Promise<UserProfile> {
    const user = await this.users.findById(id);
    if (!user) throw new AppError('User not found', 404);
    return toUserProfile(user);
  }

  async delete(requesterId: number | undefined, id: number): Promise<void> {
    if (requesterId !== id) {
      throw new AppError('You can only delete your own account', 403);
    }
    if (!(await this.users.delete(id))) {
      throw new AppError('User not found', 404);
    }
  }

  async promoteSelfToAdmin(userId: number | undefined): Promise<UserProfile> {
    const isDev = (process.env.NODE_ENV || 'development') === 'development';
    if (!isDev) {
      throw new AppError('Admin self-promotion is only available in development', 403);
    }
    if (userId === undefined) throw new AppError('Unauthorized', 401);
    const user = await this.users.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    const updatedUser = user.admin ? user : await this.users.promoteToAdmin(userId);
    return toUserProfile(updatedUser);
  }
}

export const userService = new UserService();
