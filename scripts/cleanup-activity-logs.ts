
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config();

const prisma = new PrismaClient();

async function cleanupActivityLogs() {
  console.log('Cleaning up activity logs with removed enum values...');
  
  const enumValuesToRemove = [
    'CREATE_APPLICATION_ASSET',
    'UPDATE_APPLICATION_ASSET', 
    'DELETE_APPLICATION_ASSET',
    'VIEW_APPLICATION_ASSETS',
    'BULK_ASSET_OPERATION',
    'CREATE_DESIGN_REVIEW',
    'UPDATE_DESIGN_REVIEW',
    'DELETE_DESIGN_REVIEW',
    'START_DESIGN_ANALYSIS',
    'COMPLETE_DESIGN_ANALYSIS',
    'GENERATE_DESIGN_REPORT',
    'UPLOAD_DESIGN_DIAGRAM',
    'VIEW_DESIGN_REVIEWS',
    'CREATE_THIRD_PARTY_REVIEW',
    'UPDATE_THIRD_PARTY_REVIEW',
    'DELETE_THIRD_PARTY_REVIEW',
    'START_SECURITY_SCAN',
    'COMPLETE_SECURITY_SCAN',
    'GENERATE_SECURITY_REPORT',
    'VIEW_THIRD_PARTY_REVIEWS',
    'SCHEDULE_RESCAN'
  ];

  try {
    // Delete the records using raw SQL with proper type casting
    const deleteResult = await prisma.$executeRaw`
      DELETE FROM "ActivityLog" 
      WHERE action::text = ANY(ARRAY[
        'CREATE_APPLICATION_ASSET', 'UPDATE_APPLICATION_ASSET', 'DELETE_APPLICATION_ASSET', 
        'VIEW_APPLICATION_ASSETS', 'BULK_ASSET_OPERATION', 'CREATE_DESIGN_REVIEW', 
        'UPDATE_DESIGN_REVIEW', 'DELETE_DESIGN_REVIEW', 'START_DESIGN_ANALYSIS', 
        'COMPLETE_DESIGN_ANALYSIS', 'GENERATE_DESIGN_REPORT', 'UPLOAD_DESIGN_DIAGRAM', 
        'VIEW_DESIGN_REVIEWS', 'CREATE_THIRD_PARTY_REVIEW', 'UPDATE_THIRD_PARTY_REVIEW', 
        'DELETE_THIRD_PARTY_REVIEW', 'START_SECURITY_SCAN', 'COMPLETE_SECURITY_SCAN', 
        'GENERATE_SECURITY_REPORT', 'VIEW_THIRD_PARTY_REVIEWS', 'SCHEDULE_RESCAN'
      ])
    `;

    console.log(`Successfully deleted ${deleteResult} activity log records`);

  } catch (error) {
    console.error('Error cleaning up activity logs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupActivityLogs();
