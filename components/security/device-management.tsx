
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  HelpCircle, 
  Shield, 
  ShieldCheck, 
  Trash2,
  MapPin,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Device {
  id: string;
  deviceName: string;
  deviceType: 'DESKTOP' | 'MOBILE' | 'TABLET' | 'UNKNOWN';
  browser?: string;
  os?: string;
  location?: string;
  ipAddress: string;
  isTrusted: boolean;
  isActive: boolean;
  lastActiveAt: Date;
  createdAt: Date;
}

export function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/security/devices');
      const data = await response.json();
      
      if (response.ok) {
        setDevices(data.devices.map((device: any) => ({
          ...device,
          lastActiveAt: new Date(device.lastActiveAt),
          createdAt: new Date(device.createdAt),
        })));
      } else {
        toast.error('Failed to fetch devices');
      }
    } catch (error) {
      toast.error('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceAction = async (deviceId: string, action: 'trust' | 'remove') => {
    setActionLoading(deviceId);
    try {
      const response = await fetch('/api/security/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId, action }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchDevices();
        toast.success(
          action === 'trust' 
            ? 'Device marked as trusted' 
            : 'Device removed successfully'
        );
        setRemoveDialogOpen(false);
        setDeviceToRemove(null);
      } else {
        toast.error(data.error || `Failed to ${action} device`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} device`);
    } finally {
      setActionLoading(null);
    }
  };

  const getDeviceIcon = (type: Device['deviceType']) => {
    switch (type) {
      case 'MOBILE':
        return <Smartphone className="h-5 w-5" />;
      case 'TABLET':
        return <Tablet className="h-5 w-5" />;
      case 'DESKTOP':
        return <Monitor className="h-5 w-5" />;
      default:
        return <HelpCircle className="h-5 w-5" />;
    }
  };

  const getDeviceTypeColor = (type: Device['deviceType']) => {
    switch (type) {
      case 'MOBILE':
        return 'bg-blue-100 text-blue-700';
      case 'TABLET':
        return 'bg-purple-100 text-purple-700';
      case 'DESKTOP':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const openRemoveDialog = (device: Device) => {
    setDeviceToRemove(device);
    setRemoveDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device Management</CardTitle>
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Device Management</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage devices that have accessed your account. Remove any devices you don't recognize.
          </p>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No devices found. This is unusual - you should see at least your current device.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {getDeviceIcon(device.deviceType)}
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{device.deviceName}</h4>
                        <Badge 
                          variant="secondary" 
                          className={getDeviceTypeColor(device.deviceType)}
                        >
                          {device.deviceType.toLowerCase()}
                        </Badge>
                        {device.isTrusted && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Trusted
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        {device.browser && device.os && (
                          <div>{device.browser} on {device.os}</div>
                        )}
                        
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {device.location || device.ipAddress}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Last active: {format(device.lastActiveAt, 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {!device.isTrusted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeviceAction(device.id, 'trust')}
                        disabled={actionLoading === device.id}
                        className="flex items-center gap-1"
                      >
                        <Shield className="h-3 w-3" />
                        Trust
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openRemoveDialog(device)}
                      disabled={actionLoading === device.id}
                      className="flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Device</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this device? This will sign out all sessions on this device.
            </DialogDescription>
          </DialogHeader>
          
          {deviceToRemove && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {getDeviceIcon(deviceToRemove.deviceType)}
                <span className="font-medium">{deviceToRemove.deviceName}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {deviceToRemove.browser && deviceToRemove.os && (
                  <div>{deviceToRemove.browser} on {deviceToRemove.os}</div>
                )}
                <div>{deviceToRemove.location || deviceToRemove.ipAddress}</div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deviceToRemove && handleDeviceAction(deviceToRemove.id, 'remove')}
              disabled={actionLoading === deviceToRemove?.id}
            >
              {actionLoading === deviceToRemove?.id ? 'Removing...' : 'Remove Device'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
