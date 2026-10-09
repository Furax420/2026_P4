import type { Teacher } from '@prisma/client';
import { TeacherRepository, teacherRepository } from '../repositories/teacher.repository';
import { AppError } from '../utils/app-error';

export class TeacherService {
  constructor(private readonly teachers: TeacherRepository = teacherRepository) {}

  getAll(): Promise<Teacher[]> {
    return this.teachers.findAll();
  }

  async getById(id: number): Promise<Teacher> {
    const teacher = await this.teachers.findById(id);
    if (!teacher) throw new AppError('Teacher not found', 404);
    return teacher;
  }
}

export const teacherService = new TeacherService();
