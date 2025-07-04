
// Session cleanup service
import { SessionActivityManager } from '../security/session-activity-manager';

export class SessionCleanupService {
  private static cleanupInterval: NodeJS.Timeout | null = null;

  static startCleanupScheduler(): void {
    // Clean up inactive sessions every 5 minutes
    this.cleanupInterval = setInterval(async () => {
      try {
        await SessionActivityManager.cleanupInactiveSessions();
        console.log('Session cleanup completed');
      } catch (error) {
        console.error('Session cleanup error:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    console.log('Session cleanup scheduler started');
  }

  static stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Session cleanup scheduler stopped');
    }
  }
}

// Auto-start the scheduler in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  SessionCleanupService.startCleanupScheduler();
}
