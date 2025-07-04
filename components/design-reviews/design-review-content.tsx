
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  FileText,
  Shield,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { DesignReviewWithDetails, DesignReviewDashboardStats } from '@/lib/types';
import { DesignReviewStatsCards } from './design-review-stats-cards';
import { DesignReviewListTable } from './design-review-list-table';
import { DesignReviewFormModal } from './design-review-form-modal';
import { DesignReviewDetailModal } from './design-review-detail-modal';
import { toast } from 'sonner';

export function DesignReviewContent() {
  const { data: session } = useSession();
  const [designReviews, setDesignReviews] = useState<DesignReviewWithDetails[]>([]);
  const [stats, setStats] = useState<DesignReviewDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReview, setSelectedReview] = useState<DesignReviewWithDetails | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchDesignReviews = async (page = 1, search = '') => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
      });

      const response = await fetch(`/api/design-reviews?${params}`);
      if (!response.ok) throw new Error('Failed to fetch design reviews');
      
      const data = await response.json();
      setDesignReviews(data.designReviews);
    } catch (error) {
      console.error('Error fetching design reviews:', error);
      toast.error('Failed to load design reviews');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/design-reviews/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load statistics');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDesignReviews(), fetchStats()]);
      setLoading(false);
    };

    if (session) {
      loadData();
    }
  }, [session]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDesignReviews(1, searchTerm);
  };

  const handleReviewCreated = () => {
    setShowCreateModal(false);
    fetchDesignReviews(currentPage, searchTerm);
    fetchStats();
    toast.success('Design review created successfully');
  };

  const handleReviewUpdated = () => {
    setShowDetailModal(false);
    setSelectedReview(null);
    fetchDesignReviews(currentPage, searchTerm);
    fetchStats();
    toast.success('Design review updated successfully');
  };

  const handleReviewDeleted = () => {
    setShowDetailModal(false);
    setSelectedReview(null);
    fetchDesignReviews(currentPage, searchTerm);
    fetchStats();
    toast.success('Design review deleted successfully');
  };

  const handleReviewView = (review: DesignReviewWithDetails) => {
    setSelectedReview(review);
    setShowDetailModal(true);
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/design-reviews/export?format=${format}`);
      if (!response.ok) throw new Error('Failed to export design reviews');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `design-reviews-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Design reviews exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting design reviews:', error);
      toast.error('Failed to export design reviews');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Design Reviews
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Perform comprehensive security design reviews with AI-powered analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Review
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && <DesignReviewStatsCards stats={stats} />}

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search design reviews by name, description, or scope..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Design Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Design Reviews
            <Badge variant="secondary" className="ml-2">
              {designReviews.length} reviews
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DesignReviewListTable
            designReviews={designReviews}
            onReviewView={handleReviewView}
            onReviewEdit={handleReviewView}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <DesignReviewFormModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onReviewCreated={handleReviewCreated}
      />

      {selectedReview && (
        <DesignReviewDetailModal
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          designReview={selectedReview}
          onReviewUpdated={handleReviewUpdated}
          onReviewDeleted={handleReviewDeleted}
        />
      )}
    </div>
  );
}
