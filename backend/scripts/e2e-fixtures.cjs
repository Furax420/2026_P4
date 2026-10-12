const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const databaseUrl =
  "postgresql://yogatest:yogatest@localhost:5433/yogastudio_test?schema=public";

async function resetE2eFixtures() {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    // Check the actual database before cleanup, even though its URL is fixed here.
    const database = await prisma.$queryRaw`SELECT current_database() AS name`;
    if (database[0].name !== "yogastudio_test")
      throw new Error("E2E fixtures require yogastudio_test");
    const teachers = await prisma.teacher.findMany({
      where: { firstName: "E2E", lastName: "Teacher" },
      select: { id: true },
    });
    const ids = teachers.map((teacher) => teacher.id);
    // Delete only E2E fixtures; ordinary development and other test accounts are preserved.
    await prisma.session.deleteMany({ where: { teacherId: { in: ids } } });
    await prisma.user.deleteMany({
      where: { email: { endsWith: "@e2e.test" } },
    });
    await prisma.teacher.deleteMany({ where: { id: { in: ids } } });
    const password = await bcrypt.hash("Password!123", 4);
    const admin = await prisma.user.create({
      data: {
        email: "admin@e2e.test",
        firstName: "Admin",
        lastName: "E2E",
        password,
        admin: true,
      },
    });
    const user = await prisma.user.create({
      data: {
        email: "user@e2e.test",
        firstName: "Member",
        lastName: "E2E",
        password,
      },
    });
    const teacher = await prisma.teacher.create({
      data: { firstName: "E2E", lastName: "Teacher" },
    });
    const session = await prisma.session.create({
      data: {
        name: "E2E morning yoga",
        date: new Date("2026-10-20"),
        description: "A relaxing E2E practice",
        teacherId: teacher.id,
      },
    });
    return {
      adminId: admin.id,
      userId: user.id,
      teacherId: teacher.id,
      sessionId: session.id,
    };
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { resetE2eFixtures };
