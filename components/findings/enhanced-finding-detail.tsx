
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';
import {
  Save,
  Shield,
  AlertTriangle,
  BarChart3,
  Tag,
  BookOpen,
  ExternalLink,
  Info,
  X,
  Plus,
  CheckCircle2
} from 'lucide-react';

interface FindingDetailProps {
  finding: any;
  onUpdate?: (updatedFinding: any) => void;
  onClose?: () => void;
}

export function EnhancedFindingDetail({ finding, onUpdate, onClose }: FindingDetailProps) {
  const { data: session } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: finding?.title || '',
    description: finding?.description || '',
    severity: finding?.severity || 'MEDIUM',
    strideCategory: finding?.strideCategory || 'SPOOFING',
    status: finding?.status || 'OPEN',
    recommendation: finding?.recommendation || '',
    comments: finding?.comments || '',
    nistControls: finding?.nistControls || [],
    owaspCategory: finding?.owaspCategory || '',
    cvssScore: finding?.cvssScore || 0,
    asvsLevel: finding?.asvsLevel || 1,
    tags: finding?.tags || [],
    falsePositive: finding?.falsePositive || false,
    notApplicable: finding?.notApplicable || false,
    mitigationStrategies: finding?.mitigationStrategies || [],
    references: finding?.references || []
  });

  const [newTag, setNewTag] = useState('');
  const [newMitigation, setNewMitigation] = useState('');
  const [newReference, setNewReference] = useState('');

  useEffect(() => {
    if (finding) {
      setFormData({
        title: finding.title || '',
        description: finding.description || '',
        severity: finding.severity || 'MEDIUM',
        strideCategory: finding.strideCategory || 'SPOOFING',
        status: finding.status || 'OPEN',
        recommendation: finding.recommendation || '',
        comments: finding.comments || '',
        nistControls: finding.nistControls || [],
        owaspCategory: finding.owaspCategory || '',
        cvssScore: finding.cvssScore || 0,
        asvsLevel: finding.asvsLevel || 1,
        tags: finding.tags || [],
        falsePositive: finding.falsePositive || false,
        notApplicable: finding.notApplicable || false,
        mitigationStrategies: finding.mitigationStrategies || [],
        references: finding.references || []
      });
    }
  }, [finding]);

  const isAdmin = ['ADMIN', 'BUSINESS_ADMIN'].includes(session?.user?.role || '');
  const canEdit = isAdmin || finding?.userId === session?.user?.id;

  const handleSave = async () => {
    if (!finding?.id) return;

    try {
      setIsSaving(true);
      setError('');

      const response = await fetch(`/api/findings/${finding.id}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update finding');
      }

      const updatedFinding = await response.json();
      toast.success('Finding updated successfully');
      setIsEditing(false);
      
      if (onUpdate) {
        onUpdate(updatedFinding.finding);
      }
    } catch (error: any) {
      setError(error.message);
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      title: finding?.title || '',
      description: finding?.description || '',
      severity: finding?.severity || 'MEDIUM',
      strideCategory: finding?.strideCategory || 'SPOOFING',
      status: finding?.status || 'OPEN',
      recommendation: finding?.recommendation || '',
      comments: finding?.comments || '',
      nistControls: finding?.nistControls || [],
      owaspCategory: finding?.owaspCategory || '',
      cvssScore: finding?.cvssScore || 0,
      asvsLevel: finding?.asvsLevel || 1,
      tags: finding?.tags || [],
      falsePositive: finding?.falsePositive || false,
      notApplicable: finding?.notApplicable || false,
      mitigationStrategies: finding?.mitigationStrategies || [],
      references: finding?.references || []
    });
    setIsEditing(false);
    setError('');
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((tag: string) => tag !== tagToRemove)
    }));
  };

  const addMitigation = () => {
    if (newMitigation.trim() && !formData.mitigationStrategies.includes(newMitigation.trim())) {
      setFormData(prev => ({
        ...prev,
        mitigationStrategies: [...prev.mitigationStrategies, newMitigation.trim()]
      }));
      setNewMitigation('');
    }
  };

  const removeMitigation = (mitigationToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      mitigationStrategies: prev.mitigationStrategies.filter((m: string) => m !== mitigationToRemove)
    }));
  };

  const addReference = () => {
    if (newReference.trim() && !formData.references.includes(newReference.trim())) {
      setFormData(prev => ({
        ...prev,
        references: [...prev.references, newReference.trim()]
      }));
      setNewReference('');
    }
  };

  const removeReference = (referenceToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      references: prev.references.filter((r: string) => r !== referenceToRemove)
    }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'LOW': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'RESOLVED': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (!finding) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{finding.title}</h2>
          <div className="flex items-center gap-2">
            <Badge className={getSeverityColor(finding.severity)}>
              {finding.severity}
            </Badge>
            <Badge className={getStatusColor(finding.status)}>
              {finding.status}
            </Badge>
            {finding.falsePositive && (
              <Badge variant="outline" className="bg-gray-100 text-gray-800">
                False Positive
              </Badge>
            )}
            {finding.notApplicable && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                Not Applicable
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              {isEditing ? (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    size="sm"
                  >
                    {isSaving ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                >
                  Edit
                </Button>
              )}
            </>
          )}
          {onClose && (
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="frameworks">Security Frameworks</TabsTrigger>
          <TabsTrigger value="mitigation">Mitigation</TabsTrigger>
          <TabsTrigger value="references">References</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Finding Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  {isEditing ? (
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  ) : (
                    <p className="text-sm font-medium">{finding.title}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm">{finding.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    {isEditing ? (
                      <Select
                        value={formData.severity}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={getSeverityColor(finding.severity)}>
                        {finding.severity}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    {isEditing ? (
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OPEN">Open</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="RESOLVED">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={getStatusColor(finding.status)}>
                        {finding.status}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>STRIDE Category</Label>
                  {isEditing ? (
                    <Select
                      value={formData.strideCategory}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, strideCategory: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SPOOFING">Spoofing</SelectItem>
                        <SelectItem value="TAMPERING">Tampering</SelectItem>
                        <SelectItem value="REPUDIATION">Repudiation</SelectItem>
                        <SelectItem value="INFORMATION_DISCLOSURE">Information Disclosure</SelectItem>
                        <SelectItem value="DENIAL_OF_SERVICE">Denial of Service</SelectItem>
                        <SelectItem value="ELEVATION_OF_PRIVILEGE">Elevation of Privilege</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline">
                      {finding.strideCategory}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tags & Flags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline" className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {tag}
                        {isEditing && (
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                  {isEditing && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add tag..."
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                      />
                      <Button onClick={addTag} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>False Positive</Label>
                      <Switch
                        checked={formData.falsePositive}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, falsePositive: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Not Applicable</Label>
                      <Switch
                        checked={formData.notApplicable}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notApplicable: checked }))}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Comments</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.comments}
                      onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                      placeholder="Add comments..."
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm">{finding.comments || 'No comments'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Frameworks Tab */}
        <TabsContent value="frameworks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  NIST SP 800-53 Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {formData.nistControls.map((control: string, index: number) => (
                    <Badge key={index} variant="outline" className="bg-blue-50 text-blue-800">
                      {control}
                    </Badge>
                  ))}
                </div>
                {formData.nistControls.length === 0 && (
                  <p className="text-sm text-muted-foreground">No NIST controls mapped</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                  OWASP & Scoring
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>OWASP Category</Label>
                  {isEditing ? (
                    <Input
                      value={formData.owaspCategory}
                      onChange={(e) => setFormData(prev => ({ ...prev, owaspCategory: e.target.value }))}
                      placeholder="e.g., A01"
                    />
                  ) : (
                    <Badge variant="outline" className="bg-orange-50 text-orange-800">
                      {finding.owaspCategory || 'Not mapped'}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CVSS Score</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formData.cvssScore}
                        onChange={(e) => setFormData(prev => ({ ...prev, cvssScore: parseFloat(e.target.value) || 0 }))}
                      />
                    ) : (
                      <Badge variant="outline">
                        {finding.cvssScore || 'N/A'}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>ASVS Level</Label>
                    {isEditing ? (
                      <Select
                        value={formData.asvsLevel.toString()}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, asvsLevel: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Level 1</SelectItem>
                          <SelectItem value="2">Level 2</SelectItem>
                          <SelectItem value="3">Level 3</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">
                        Level {finding.asvsLevel || 1}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Mitigation Tab */}
        <TabsContent value="mitigation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recommendations & Mitigation Strategies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Recommendation</Label>
                {isEditing ? (
                  <Textarea
                    value={formData.recommendation}
                    onChange={(e) => setFormData(prev => ({ ...prev, recommendation: e.target.value }))}
                    placeholder="Provide detailed recommendations..."
                    rows={4}
                  />
                ) : (
                  <p className="text-sm">{finding.recommendation || 'No recommendation provided'}</p>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Mitigation Strategies</Label>
                <div className="space-y-2">
                  {formData.mitigationStrategies.map((strategy: string, index: number) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm flex-1">{strategy}</span>
                      {isEditing && (
                        <button
                          onClick={() => removeMitigation(strategy)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                {isEditing && (
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add mitigation strategy..."
                      value={newMitigation}
                      onChange={(e) => setNewMitigation(e.target.value)}
                      rows={2}
                    />
                    <Button onClick={addMitigation} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* References Tab */}
        <TabsContent value="references" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-600" />
                References & Documentation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {formData.references.map((reference: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <ExternalLink className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <a 
                      href={reference} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline flex-1"
                    >
                      {reference}
                    </a>
                    {isEditing && (
                      <button
                        onClick={() => removeReference(reference)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {formData.references.length === 0 && (
                <p className="text-sm text-muted-foreground">No references added</p>
              )}
              
              {isEditing && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add reference URL..."
                    value={newReference}
                    onChange={(e) => setNewReference(e.target.value)}
                  />
                  <Button onClick={addReference} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
