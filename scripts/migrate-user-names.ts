
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function migrateUserNames() {
  try {
    console.log('Starting user name migration...');
    
    // Get all users with existing names
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
      },
      where: {
        name: {
          not: null,
        },
      },
    });

    console.log(`Found ${users.length} users to migrate`);

    for (const user of users) {
      if (user.name) {
        // Split the name into firstName and lastName
        const nameParts = user.name.trim().split(/\s+/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Update user with new fields
        await prisma.user.update({
          where: { id: user.id },
          data: {
            firstName: firstName || null,
            lastName: lastName || null,
          },
        });

        console.log(`Migrated: ${user.name} -> firstName: "${firstName}", lastName: "${lastName}"`);
      }
    }

    console.log('User name migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateUserNames().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
