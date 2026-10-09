import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { prisma } from '../database/prisma';
import { DuplicateEmailError } from '../utils/duplicate-email-error';

export class UserRepository {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await prisma.user.create({ data });
    } catch (error: unknown) {
      // The unique constraint also protects simultaneous registrations.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DuplicateEmailError();
      }
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    const result = await prisma.user.deleteMany({ where: { id } });
    return result.count > 0;
  }

  promoteToAdmin(id: number): Promise<User> {
    return prisma.user.update({ where: { id }, data: { admin: true } });
  }
}

export const userRepository = new UserRepository();
