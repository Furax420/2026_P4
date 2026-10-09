import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { AppError } from "../utils/app-error";

import { prisma } from "../database/prisma";
export class TeacherController {
  async getAll(_req: AuthRequest, res: Response): Promise<void> {
    const teachers = await prisma.teacher.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const response = teachers.map((teacher) => ({
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    }));

    res.status(200).json(response);
  }
  async getById(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      throw new AppError("Teacher ID is required", 400);
    }

    if (typeof id !== "string") {
      throw new AppError("Invalid teacher ID", 400);
    }

    const teacherId = parseInt(id);

    if (isNaN(teacherId)) {
      throw new AppError("Invalid teacher ID", 400);
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new AppError("Teacher not found", 404);
    }

    const response = {
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    };

    res.status(200).json(response);
  }
}
