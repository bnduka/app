
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, LogOut } from 'lucide-react';

interface SessionTimeoutProps {
  warningMinutes?: number;
}

export function SessionTimeout({ warningMinutes = 1 }: SessionTimeoutProps) {
  const { data: session, update } = useSession();
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const warningShownRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const warningTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const sessionTimeout = (session as any)?.sessionTimeout || 5; // minutes

  useEffect(() => {
    if (!session) return;

    const resetTimer = () => {
      // Clear existing timers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      
      warningShownRef.current = false;
      setShowWarning(false);

      const warningTime = (sessionTimeout - warningMinutes) * 60 * 1000;
      const timeoutTime = sessionTimeout * 60 * 1000;

      // Set warning timer
      warningTimeoutRef.current = setTimeout(() => {
        if (!warningShownRef.current) {
          setShowWarning(true);
          warningShownRef.current = true;
          setTimeLeft(warningMinutes * 60);

          // Start countdown
          const countdownInterval = setInterval(() => {
            setTimeLeft(prev => {
              if (prev <= 1) {
                clearInterval(countdownInterval);
                handleTimeout();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }, warningTime);

      // Set auto-logout timer
      timeoutRef.current = setTimeout(() => {
        handleTimeout();
      }, timeoutTime);
    };

    const handleTimeout = async () => {
      setShowWarning(false);
      await signOut({ 
        callbackUrl: '/login?expired=true',
        redirect: true 
      });
    };

    const handleActivity = () => {
      if (!warningShownRef.current) {
        resetTimer();
      }
    };

    // Activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initial timer setup
    resetTimer();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [session, sessionTimeout, warningMinutes]);

  const handleExtendSession = async () => {
    setIsExtending(true);
    try {
      // Update session to refresh it
      await update();
      setShowWarning(false);
      warningShownRef.current = false;
    } catch (error) {
      console.error('Failed to extend session:', error);
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: '/login',
      redirect: true 
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressValue = timeLeft > 0 ? (timeLeft / (warningMinutes * 60)) * 100 : 0;

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Session Expiring Soon
          </DialogTitle>
          <DialogDescription>
            Your session will expire in <strong>{formatTime(timeLeft)}</strong> due to inactivity.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Time remaining</span>
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
            <Progress value={progressValue} className="h-2" />
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleExtendSession}
              disabled={isExtending}
              className="flex-1"
            >
              {isExtending ? 'Extending...' : 'Stay Logged In'}
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Click "Stay Logged In" to extend your session or continue using the application.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
