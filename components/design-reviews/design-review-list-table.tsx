
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
  FileText,
  BarChart3,
  AlertTriangle,
  Clock,
  CheckCircle,
  Building
} from 'lucide-react';
import { DesignReviewWithDetails } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface DesignReviewListTableProps {
  designReviews: DesignReviewWithDetails[];
  onReviewView: (review: DesignReviewWithDetails) => void;
  onReviewEdit: (review: DesignReviewWithDetails) => void;
}

export function DesignReviewListTable({ 
  designReviews, 
  onReviewView, 
  onReviewEdit 
}: DesignReviewListTableProps) {
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      DRAFT: { variant: 'secondary' },
      IN_PROGRESS: { variant: 'outline', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      UNDER_REVIEW: { variant: 'outline', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      COMPLETED: { variant: 'default', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      CANCELLED: { variant: 'destructive' },
      ARCHIVED: { variant: 'outline' },
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
      case 'UNDER_REVIEW':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'CANCELLED':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReviews(designReviews.map(review => review.id));
    } else {
      setSelectedReviews([]);
    }
  };

  const handleSelectReview = (reviewId: string, checked: boolean) => {
    if (checked) {
      setSelectedReviews(prev => [...prev, reviewId]);
    } else {
      setSelectedReviews(prev => prev.filter(id => id !== reviewId));
    }
  };

  if (designReviews.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No design reviews found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Start by creating your first security design review to assess system architecture.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedReviews.length > 0 && (
        <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <span className="text-sm font-medium">
            {selectedReviews.length} review(s) selected
          </span>
          <Button size="sm" variant="outline">
            Bulk Actions
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedReviews.length === designReviews.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Review</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Security Assessment</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Linked Assets</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {designReviews.map((review) => (
              <TableRow key={review.id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
                <TableCell>
                  <Checkbox
                    checked={selectedReviews.includes(review.id)}
                    onCheckedChange={(checked) => handleSelectReview(review.id, !!checked)}
                  />
                </TableCell>
                <TableCell onClick={() => onReviewView(review)}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(review.status)}
                      <span className="font-medium">{review.name}</span>
                    </div>
                    {review.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                        {review.description}
                      </div>
                    )}
                    {review.scope && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        Scope: {review.scope}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={() => onReviewView(review)}>
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-xs">
                      {review.reviewType.replace(/_/g, ' ')}
                    </Badge>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {review.systemType.replace(/_/g, ' ')}
                    </div>
                  </div>
                </TableCell>
                <TableCell onClick={() => onReviewView(review)}>
                  {getStatusBadge(review.status)}
                </TableCell>
                <TableCell onClick={() => onReviewView(review)}>
                  <div className="space-y-1">
                    {review.securityScore !== null && (
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-3 w-3" />
                        <span className="text-sm font-medium">{review.securityScore}/100</span>
                      </div>
                    )}
                    {review.securityGrade && getGradeBadge(review.securityGrade)}
                  </div>
                </TableCell>
                <TableCell onClick={() => onReviewView(review)}>
                  {getRiskBadge(review.overallRisk)}
                </TableCell>
                <TableCell onClick={() => onReviewView(review)}>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{review.progress}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${review.progress}%` }}
                      ></div>
                    </div>
                  </div>
                </TableCell>
                <TableCell onClick={() => onReviewView(review)}>
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    <span className="text-sm">
                      {review.linkedAssets?.length || 0}
                    </span>
                  </div>
                </TableCell>
                <TableCell onClick={() => onReviewView(review)}>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(review.updatedAt), { addSuffix: true })}
                  </div>
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
