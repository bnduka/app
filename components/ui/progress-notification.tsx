
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  CheckCircle, 
  AlertTriangle, 
  Brain, 
  X,
  Clock,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProgressNotificationProps {
  isVisible: boolean;
  type: 'progress' | 'completed' | 'error';
  title: string;
  message: string;
  progress?: number;
  onClose?: () => void;
  onViewResults?: () => void;
  autoHide?: boolean;
  duration?: number;
}

export function ProgressNotification({
  isVisible,
  type,
  title,
  message,
  progress = 0,
  onClose,
  onViewResults,
  autoHide = false,
  duration = 5000,
}: ProgressNotificationProps) {
  const [visible, setVisible] = useState(isVisible);

  useEffect(() => {
    setVisible(isVisible);
  }, [isVisible]);

  useEffect(() => {
    if (autoHide && isVisible && type === 'completed') {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, type, autoHide, duration, onClose]);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'progress':
        return <Brain className="h-6 w-6 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'progress':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800';
      case 'completed':
        return 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 w-96 max-w-sm">
      <Card className={cn("shadow-lg border-2", getBackgroundColor())}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">
                  {title}
                </h4>
                {onClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setVisible(false);
                      onClose();
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground mt-1">
                {message}
              </p>

              {type === 'progress' && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {type === 'completed' && onViewResults && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={onViewResults}
                    className="w-full"
                  >
                    <Zap className="mr-2 h-3 w-3" />
                    View Results
                  </Button>
                </div>
              )}

              {type === 'error' && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setVisible(false);
                      onClose?.();
                    }}
                    className="w-full"
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for managing progress notifications
export function useProgressNotification() {
  const [notification, setNotification] = useState<ProgressNotificationProps & { id: string } | null>(null);

  const showProgress = (title: string, message: string, progress: number = 0) => {
    setNotification({
      id: Date.now().toString(),
      isVisible: true,
      type: 'progress',
      title,
      message,
      progress,
      onClose: () => setNotification(null),
    });
  };

  const showCompleted = (title: string, message: string, onViewResults?: () => void) => {
    setNotification({
      id: Date.now().toString(),
      isVisible: true,
      type: 'completed',
      title,
      message,
      onClose: () => setNotification(null),
      onViewResults,
      autoHide: true,
    });
  };

  const showError = (title: string, message: string) => {
    setNotification({
      id: Date.now().toString(),
      isVisible: true,
      type: 'error',
      title,
      message,
      onClose: () => setNotification(null),
    });
  };

  const updateProgress = (progress: number) => {
    if (notification && notification.type === 'progress') {
      setNotification({
        ...notification,
        progress,
      });
    }
  };

  const hide = () => {
    setNotification(null);
  };

  return {
    notification,
    showProgress,
    showCompleted,
    showError,
    updateProgress,
    hide,
  };
}
