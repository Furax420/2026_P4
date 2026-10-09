import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import type { SessionRecord, SessionWriteData, SessionUpdateData } from '../types/session.types';

const relations = { teacher: true, participants: true } as const;

export class SessionRepository {
  findAll(): Promise<SessionRecord[]> {
    return prisma.session.findMany({ include: relations });
  }

  findById(id: number): Promise<SessionRecord | null> {
    return prisma.session.findUnique({ where: { id }, include: relations });
  }

  async exists(id: number): Promise<boolean> {
    const session = await prisma.session.findUnique({ where: { id }, select: { id: true } });
    return session !== null;
  }

  create(data: SessionWriteData): Promise<SessionRecord> {
    return prisma.session.create({ data, include: relations });
  }

  async update(id: number, data: SessionUpdateData): Promise<SessionRecord | null> {
    try {
      return await prisma.session.update({ where: { id }, data, include: relations });
    } catch (error: unknown) {
      // Another request may have deleted the session after the existence check.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }

  async delete(id: number): Promise<boolean> {
    const result = await prisma.session.deleteMany({ where: { id } });
    return result.count > 0;
  }
}

export const sessionRepository = new SessionRepository();
