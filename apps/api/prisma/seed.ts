import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'admin@motionops.local' },
    update: {},
    create: {
      email: 'admin@motionops.local',
      displayName: 'Admin',
      role: 'SUPER_ADMIN',
      supabaseId: 'seed-admin-supabase-id', // will be linked on first login
      status: 'active',
    },
  });
  console.log('Seed admin created:', admin.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
