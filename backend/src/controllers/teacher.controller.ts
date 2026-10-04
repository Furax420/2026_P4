import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class TeacherController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const teachers = await prisma.teacher.findMany({
        orderBy: {
          createdAt: 'desc',
        },
      });

      const response: any = teachers.map((teacher: any) => ({
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
      }));

      return res.status(200).json(response);
    } catch (error: any) {
      console.error('Get teachers error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        return res.status(400).json({ message: 'Teacher ID is required' });
      }

      const teacherId = parseInt(id);

      if (isNaN(teacherId)) {
        return res.status(400).json({ message: 'Invalid teacher ID' });
      }

      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
      });

      if (!teacher) {
        return res.status(404).json({ message: 'Teacher not found' });
      }

      const response: any = {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        createdAt: teacher.createdAt,
        updatedAt: teacher.updatedAt,
      };

      return res.status(200).json(response);
    } catch (error: any) {
      console.error('Get teacher error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}
