import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Hash password for admin user
  const hashedPassword = await bcrypt.hash('test!1234', 10);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'yoga@studio.com' },
    update: {},
    create: {
      email: 'yoga@studio.com',
      firstName: 'Admin',
      lastName: 'Yoga',
      password: hashedPassword,
      admin: true,
    },
  });
  console.log('Admin user created:', admin.email);

  // Create regular user
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@test.com' },
    update: {},
    create: {
      email: 'user@test.com',
      firstName: 'John',
      lastName: 'Doe',
      password: hashedPassword,
      admin: false,
    },
  });
  console.log('Regular user created:', regularUser.email);

  // Create teachers
  const teacher1 = await prisma.teacher.upsert({
    where: { id: 1 },
    update: {},
    create: {
      firstName: 'Margot',
      lastName: 'Delahaye',
    },
  });

  const teacher2 = await prisma.teacher.upsert({
    where: { id: 2 },
    update: {},
    create: {
      firstName: 'Hélène',
      lastName: 'Thiercelin',
    },
  });

  const teacher3 = await prisma.teacher.upsert({
    where: { id: 3 },
    update: {},
    create: {
      firstName: 'David',
      lastName: 'Martin',
    },
  });

  console.log('Teachers created');

  // Create sessions
  const session1 = await prisma.session.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Yoga Vinyasa',
      date: new Date('2026-02-15'),
      description: 'Un cours dynamique qui synchronise le mouvement et la respiration. Idéal pour renforcer le corps et améliorer la flexibilité.',
      teacherId: teacher1.id,
    },
  });

  const session2 = await prisma.session.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Yoga Hatha',
      date: new Date('2026-02-20'),
      description: 'Une pratique douce et accessible à tous, axée sur les postures et la respiration consciente.',
      teacherId: teacher2.id,
    },
  });

  const session3 = await prisma.session.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Yoga Ashtanga',
      date: new Date('2026-02-25'),
      description: 'Un style de yoga traditionnel et structuré, avec une série de postures enchaînées de manière fluide.',
      teacherId: teacher1.id,
    },
  });

  const session4 = await prisma.session.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: 'Yin Yoga',
      date: new Date('2026-03-01'),
      description: 'Une pratique relaxante et méditative où les postures sont tenues longtemps pour étirer les tissus profonds.',
      teacherId: teacher3.id,
    },
  });

  console.log('Sessions created');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
