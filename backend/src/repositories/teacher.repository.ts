import type { Teacher } from '@prisma/client';
import { prisma } from '../database/prisma';

export class TeacherRepository {
  findAll(): Promise<Teacher[]> {
    return prisma.teacher.findMany({ orderBy: { createdAt: 'desc' } });
  }

  findById(id: number): Promise<Teacher | null> {
    return prisma.teacher.findUnique({ where: { id } });
  }
}

export const teacherRepository = new TeacherRepository();
