
import { cn } from '@/lib/utils';
import { FindingStatus, ThreatModelStatus, Severity, StrideCategory } from '@/lib/types';

interface StatusBadgeProps {
  status: FindingStatus | ThreatModelStatus | Severity | StrideCategory;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'status-open';
      case 'IN_PROGRESS':
        return 'status-in-progress';
      case 'RESOLVED':
        return 'status-resolved';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
      case 'ANALYZING':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'COMPLETED':
        return 'status-resolved';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
      case 'CRITICAL':
        return 'severity-critical';
      case 'HIGH':
        return 'severity-high';
      case 'MEDIUM':
        return 'severity-medium';
      case 'LOW':
        return 'severity-low';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'INFORMATION_DISCLOSURE':
        return 'Info Disclosure';
      case 'DENIAL_OF_SERVICE':
        return 'DoS';
      case 'ELEVATION_OF_PRIVILEGE':
        return 'Elevation';
      default:
        return status.charAt(0) + status.slice(1).toLowerCase();
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        getStatusStyles(status),
        className
      )}
    >
      {getStatusText(status)}
    </span>
  );
}
