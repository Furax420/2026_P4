import type { Prisma, Teacher } from '@prisma/client';

export type SessionRecord = Prisma.SessionGetPayload<{
  include: { teacher: true; participants: true };
}>;

export interface SessionWriteData {
  name: string;
  date: Date;
  description: string;
  teacherId: number;
}

export type SessionUpdateData = Partial<SessionWriteData>;

export interface SessionResponse {
  id: number;
  name: string;
  date: Date;
  description: string;
  teacher: Pick<Teacher, 'id' | 'firstName' | 'lastName'>;
  users: number[];
  createdAt: Date;
  updatedAt: Date;
}
