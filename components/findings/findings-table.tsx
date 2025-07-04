
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FindingDetail } from './finding-detail';
import { toast } from 'sonner';
import { Eye, Filter } from 'lucide-react';
import { FindingWithDetails, FindingStatus, Severity, StrideCategory } from '@/lib/types';

interface FindingsTableProps {
  initialFilters?: {
    search?: string;
    status?: string;
    severity?: string;
    category?: string;
  };
}

export function FindingsTable({ initialFilters = {} }: FindingsTableProps) {
  const { data: session } = useSession();
  const [findings, setFindings] = useState<FindingWithDetails[]>([]);
  const [filteredFindings, setFilteredFindings] = useState<FindingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState<FindingWithDetails | null>(null);
  const [filters, setFilters] = useState({
    search: initialFilters.search || '',
    status: initialFilters.status || 'all',
    severity: initialFilters.severity || 'all',
    category: initialFilters.category || 'all',
  });

  useEffect(() => {
    fetchFindings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [findings, filters]);

  const fetchFindings = async () => {
    try {
      const response = await fetch('/api/findings');
      if (response.ok) {
        const data = await response.json();
        setFindings(data.findings || []);
      } else {
        toast.error('Failed to fetch findings');
      }
    } catch (error) {
      console.error('Error fetching findings:', error);
      toast.error('Error fetching findings');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...findings];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(finding => 
        finding.threatScenario.toLowerCase().includes(filters.search.toLowerCase()) ||
        finding.description.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(finding => finding.status === filters.status);
    }

    // Severity filter
    if (filters.severity !== 'all') {
      filtered = filtered.filter(finding => finding.severity === filters.severity);
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(finding => finding.strideCategory === filters.category);
    }

    setFilteredFindings(filtered);
  };

  const updateFinding = async (findingId: string, updates: Partial<FindingWithDetails>) => {
    try {
      const response = await fetch(`/api/findings/${findingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedFinding = await response.json();
        setFindings(prev => prev.map(f => 
          f.id === findingId ? { ...f, ...updatedFinding.finding } : f
        ));
        toast.success('Finding updated successfully');
      } else {
        toast.error('Failed to update finding');
      }
    } catch (error) {
      console.error('Error updating finding:', error);
      toast.error('Error updating finding');
    }
  };

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search findings..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          />
        </div>
        
        <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.severity} onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.category} onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="STRIDE Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="SPOOFING">Spoofing</SelectItem>
            <SelectItem value="TAMPERING">Tampering</SelectItem>
            <SelectItem value="REPUDIATION">Repudiation</SelectItem>
            <SelectItem value="INFORMATION_DISCLOSURE">Info Disclosure</SelectItem>
            <SelectItem value="DENIAL_OF_SERVICE">DoS</SelectItem>
            <SelectItem value="ELEVATION_OF_PRIVILEGE">Elevation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredFindings.length} of {findings.length} findings
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Threat Scenario</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Threat Model</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFindings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No findings found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredFindings.map((finding) => (
                <TableRow key={finding.id}>
                  <TableCell className="font-medium">
                    <div className="max-w-[200px]">
                      <p className="truncate">{finding.threatScenario}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {finding.description}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={finding.severity} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={finding.strideCategory} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={finding.status} />
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px]">
                      <p className="text-sm truncate">{finding.threatModel.name}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(finding.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFinding(finding)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Finding Detail Modal */}
      {selectedFinding && (
        <FindingDetail
          finding={selectedFinding}
          onUpdate={updateFinding}
          onClose={() => setSelectedFinding(null)}
        />
      )}
    </div>
  );
}
