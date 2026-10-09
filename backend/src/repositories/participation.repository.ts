import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';

export class ParticipationRepository {
  async create(sessionId: number, userId: number): Promise<boolean> {
    try {
      await prisma.sessionParticipation.create({ data: { sessionId, userId } });
      return true;
    } catch (error: unknown) {
      // The unique constraint protects simultaneous requests to join.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return false;
      }
      throw error;
    }
  }

  async delete(sessionId: number, userId: number): Promise<boolean> {
    const result = await prisma.sessionParticipation.deleteMany({ where: { sessionId, userId } });
    return result.count > 0;
  }
}

export const participationRepository = new ParticipationRepository();
