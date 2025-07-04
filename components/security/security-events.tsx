
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertTriangle, 
  Shield, 
  CheckCircle, 
  Clock,
  User,
  MapPin,
  Monitor,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SecurityEvent {
  id: string;
  eventType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: string;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  user?: {
    id: string;
    name?: string;
    email: string;
    organization?: {
      name: string;
    };
  };
}

interface SecurityEventsProps {
  isAdmin?: boolean;
  limit?: number;
}

export function SecurityEvents({ isAdmin = false, limit = 50 }: SecurityEventsProps) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/security/events?limit=${limit}`);
      const data = await response.json();
      
      if (response.ok) {
        setEvents(data.events.map((event: any) => ({
          ...event,
          createdAt: new Date(event.createdAt),
          resolvedAt: event.resolvedAt ? new Date(event.resolvedAt) : undefined,
        })));
      } else {
        toast.error('Failed to fetch security events');
      }
    } catch (error) {
      toast.error('Failed to fetch security events');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveEvent = async (eventId: string) => {
    setResolving(eventId);
    try {
      const response = await fetch(`/api/security/events/${eventId}/resolve`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        await fetchEvents();
        toast.success('Security event resolved');
      } else {
        toast.error('Failed to resolve security event');
      }
    } catch (error) {
      toast.error('Failed to resolve security event');
    } finally {
      setResolving(null);
    }
  };

  const getSeverityIcon = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'MEDIUM':
        return <Shield className="h-4 w-4 text-yellow-500" />;
      case 'LOW':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getSeverityColor = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getEventTypeColor = (eventType: string) => {
    if (eventType.includes('LOGIN')) return 'bg-blue-100 text-blue-700';
    if (eventType.includes('PASSWORD')) return 'bg-purple-100 text-purple-700';
    if (eventType.includes('TWO_FACTOR')) return 'bg-indigo-100 text-indigo-700';
    if (eventType.includes('DEVICE')) return 'bg-cyan-100 text-cyan-700';
    if (eventType.includes('API_KEY')) return 'bg-emerald-100 text-emerald-700';
    return 'bg-gray-100 text-gray-700';
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'unresolved') return !event.isResolved;
    if (filter === 'critical') return event.severity === 'CRITICAL';
    if (filter === 'high') return event.severity === 'HIGH';
    return event.severity === filter.toUpperCase();
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Security Events</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="unresolved">Unresolved</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
              <SelectItem value="medium">Medium Priority</SelectItem>
              <SelectItem value="low">Low Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Security Events</h3>
            <p className="text-muted-foreground">
              {filter === 'all' 
                ? 'No security events found.' 
                : `No ${filter} security events found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between p-4 border rounded-lg"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {getSeverityIcon(event.severity)}
                  </div>
                  
                  <div className="space-y-2 flex-1">
                    <div className="flex items-start gap-2 flex-wrap">
                      <Badge 
                        variant="outline" 
                        className={getSeverityColor(event.severity)}
                      >
                        {event.severity}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={getEventTypeColor(event.eventType)}
                      >
                        {formatEventType(event.eventType)}
                      </Badge>
                      {event.isResolved && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Resolved
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-medium">{event.description}</h4>
                      {event.details && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.details}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(event.createdAt, 'MMM d, yyyy HH:mm')}
                      </span>
                      
                      {event.user && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {event.user.name || event.user.email}
                          {event.user.organization && (
                            <span className="text-muted-foreground">
                              ({event.user.organization.name})
                            </span>
                          )}
                        </span>
                      )}
                      
                      {event.ipAddress && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.ipAddress}
                        </span>
                      )}
                      
                      {event.userAgent && (
                        <span className="flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          {event.userAgent.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    
                    {event.isResolved && event.resolvedBy && event.resolvedAt && (
                      <div className="text-xs text-green-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Resolved by {event.resolvedBy} on {format(event.resolvedAt, 'MMM d, yyyy HH:mm')}
                      </div>
                    )}
                  </div>
                </div>
                
                {isAdmin && !event.isResolved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveEvent(event.id)}
                    disabled={resolving === event.id}
                    className="ml-4"
                  >
                    {resolving === event.id ? 'Resolving...' : 'Resolve'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
