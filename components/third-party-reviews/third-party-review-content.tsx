
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Download, 
  Globe,
  Shield,
  BarChart3,
  AlertTriangle,
  Scan
} from 'lucide-react';
import { ThirdPartyReviewWithDetails, ThirdPartyDashboardStats } from '@/lib/types';
import { ThirdPartyReviewStatsCards } from './third-party-review-stats-cards';
import { ThirdPartyReviewListTable } from './third-party-review-list-table';
import { ThirdPartyReviewFormModal } from './third-party-review-form-modal';
import { ThirdPartyReviewDetailModal } from './third-party-review-detail-modal';
import { toast } from 'sonner';

export function ThirdPartyReviewContent() {
  const { data: session } = useSession();
  const [thirdPartyReviews, setThirdPartyReviews] = useState<ThirdPartyReviewWithDetails[]>([]);
  const [stats, setStats] = useState<ThirdPartyDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReview, setSelectedReview] = useState<ThirdPartyReviewWithDetails | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchThirdPartyReviews = async (page = 1, search = '') => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
      });

      const response = await fetch(`/api/third-party-reviews?${params}`);
      if (!response.ok) throw new Error('Failed to fetch third-party reviews');
      
      const data = await response.json();
      setThirdPartyReviews(data.thirdPartyReviews);
    } catch (error) {
      console.error('Error fetching third-party reviews:', error);
      toast.error('Failed to load third-party reviews');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/third-party-reviews/stats');
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
      await Promise.all([fetchThirdPartyReviews(), fetchStats()]);
      setLoading(false);
    };

    if (session) {
      loadData();
    }
  }, [session]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchThirdPartyReviews(1, searchTerm);
  };

  const handleReviewCreated = () => {
    setShowCreateModal(false);
    fetchThirdPartyReviews(currentPage, searchTerm);
    fetchStats();
    toast.success('Third-party review created successfully');
  };

  const handleReviewUpdated = () => {
    setShowDetailModal(false);
    setSelectedReview(null);
    fetchThirdPartyReviews(currentPage, searchTerm);
    fetchStats();
    toast.success('Third-party review updated successfully');
  };

  const handleReviewDeleted = () => {
    setShowDetailModal(false);
    setSelectedReview(null);
    fetchThirdPartyReviews(currentPage, searchTerm);
    fetchStats();
    toast.success('Third-party review deleted successfully');
  };

  const handleReviewView = (review: ThirdPartyReviewWithDetails) => {
    setSelectedReview(review);
    setShowDetailModal(true);
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(`/api/third-party-reviews/export?format=${format}`);
      if (!response.ok) throw new Error('Failed to export third-party reviews');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `third-party-reviews-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Third-party reviews exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting third-party reviews:', error);
      toast.error('Failed to export third-party reviews');
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
            Third-Party Reviews
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Assess security posture of external applications and SaaS tools
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
      {stats && <ThirdPartyReviewStatsCards stats={stats} />}

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search third-party reviews by name, vendor, or URL..."
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

      {/* Third-Party Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Third-Party Applications
            <Badge variant="secondary" className="ml-2">
              {thirdPartyReviews.length} reviews
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ThirdPartyReviewListTable
            thirdPartyReviews={thirdPartyReviews}
            onReviewView={handleReviewView}
            onReviewEdit={handleReviewView}
          />
        </CardContent>
      </Card>

      {/* Modals */}
      <ThirdPartyReviewFormModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onReviewCreated={handleReviewCreated}
      />

      {selectedReview && (
        <ThirdPartyReviewDetailModal
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          thirdPartyReview={selectedReview}
          onReviewUpdated={handleReviewUpdated}
          onReviewDeleted={handleReviewDeleted}
        />
      )}
    </div>
  );
}
