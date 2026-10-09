import { PrismaClient } from "@prisma/client";

// Share one client across the application.
export const prisma = new PrismaClient();
