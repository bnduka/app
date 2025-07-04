
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Eye, 
  Edit, 
  MoreHorizontal, 
  Globe,
  BarChart3,
  AlertTriangle,
  Clock,
  CheckCircle,
  Scan,
  ExternalLink
} from 'lucide-react';
import { ThirdPartyReviewWithDetails } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface ThirdPartyReviewListTableProps {
  thirdPartyReviews: ThirdPartyReviewWithDetails[];
  onReviewView: (review: ThirdPartyReviewWithDetails) => void;
  onReviewEdit: (review: ThirdPartyReviewWithDetails) => void;
}

export function ThirdPartyReviewListTable({ 
  thirdPartyReviews, 
  onReviewView, 
  onReviewEdit 
}: ThirdPartyReviewListTableProps) {
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PENDING: { variant: 'secondary' },
      IN_PROGRESS: { variant: 'outline', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      COMPLETED: { variant: 'default', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      FAILED: { variant: 'destructive' },
      CANCELLED: { variant: 'outline' },
      SCHEDULED: { variant: 'outline', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    };

    const config = variants[status] || { variant: 'secondary' };
    return (
      <Badge {...config}>
        {status.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getGradeBadge = (grade: string | null) => {
    if (!grade) return null;

    const variants: Record<string, any> = {
      A: { variant: 'default', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      B: { variant: 'outline', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      C: { variant: 'outline', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      D: { variant: 'outline', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
      F: { variant: 'destructive' },
    };

    const config = variants[grade] || { variant: 'secondary' };
    return (
      <Badge {...config}>
        Grade {grade}
      </Badge>
    );
  };

  const getRiskBadge = (risk: string) => {
    const variants: Record<string, any> = {
      VERY_LOW: { variant: 'outline', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      LOW: { variant: 'outline', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      MEDIUM: { variant: 'outline', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      HIGH: { variant: 'outline', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
      VERY_HIGH: { variant: 'destructive' },
      CRITICAL: { variant: 'destructive' },
    };

    const config = variants[risk] || { variant: 'secondary' };
    return (
      <Badge {...config}>
        {risk.replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'FAILED':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'SCHEDULED':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Globe className="h-4 w-4 text-gray-600" />;
    }
  };

  if (thirdPartyReviews.length === 0) {
    return (
      <div className="text-center py-12">
        <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No third-party reviews found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Start by adding your first third-party application for security assessment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Security Assessment</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>Last Scan</TableHead>
              <TableHead>Next Scan</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {thirdPartyReviews.map((review) => (
              <TableRow key={review.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <TableCell onClick={() => onReviewView(review)}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(review.status)}
                      <span className="font-medium">{review.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                      <Globe className="h-3 w-3" />
                      {new URL(review.applicationUrl).hostname}
                      <ExternalLink className="h-3 w-3" />
                    </div>
                    {review.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                        {review.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={() => onReviewView(review)}>
                  <div className="space-y-1">
                    {review.vendor && (
                      <div className="font-medium text-sm">{review.vendor}</div>
                    )}
                    {review.applicationCategory && (
                      <Badge variant="outline" className="text-xs">
                        {review.applicationCategory}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={() => onReviewView(review)}>
                  {getStatusBadge(review.status)}
                </TableCell>
                <TableCell onClick={() => onReviewView(review)}>
                  <div className="space-y-1">
                    {review.overallScore !== null && (
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-3 w-3" />
                        <span className="text-sm font-medium">{review.overallScore}/100</span>
                      </div>
                    )}
                    {review.securityGrade && getGradeBadge(review.securityGrade)}
                  </div>
                </TableCell>
                <TableCell onClick={() => onReviewView(review)}>
                  {getRiskBadge(review.riskLevel)}
                </TableCell>
                <TableCell onClick={() => onReviewView(review)}>
                  {review.lastScanDate ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(review.lastScanDate), { addSuffix: true })}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Never</span>
                  )}
                </TableCell>
                <TableCell onClick={() => onReviewView(review)}>
                  {review.nextScanDate ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(review.nextScanDate), { addSuffix: true })}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Not scheduled</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onReviewView(review)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onReviewEdit(review)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Review
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Scan className="h-4 w-4 mr-2" />
                        Start Scan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
