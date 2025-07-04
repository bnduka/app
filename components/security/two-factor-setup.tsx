
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, ShieldCheck, Mail, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TwoFactorSetupProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function TwoFactorSetup({ isEnabled, onToggle }: TwoFactorSetupProps) {
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const handleGenerate2FA = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/security/2fa/generate', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setCodeSent(true);
        toast.success('Verification code sent to your email');
      } else {
        toast.error(data.error || 'Failed to send verification code');
      }
    } catch (error) {
      toast.error('Failed to generate verification code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode.trim()) {
      toast.error('Please enter the verification code');
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/security/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (data.success) {
        await handleToggle2FA(true);
        setIsSetupOpen(false);
        setVerificationCode('');
        setCodeSent(false);
        toast.success('Two-factor authentication enabled successfully');
      } else {
        toast.error(data.error || 'Invalid verification code');
      }
    } catch (error) {
      toast.error('Failed to verify code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleToggle2FA = async (enable: boolean) => {
    try {
      const response = await fetch('/api/security/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enable }),
      });

      const data = await response.json();

      if (data.success) {
        onToggle(data.twoFactorEnabled);
        if (!enable) {
          toast.success('Two-factor authentication disabled');
        }
      } else {
        toast.error('Failed to update 2FA settings');
      }
    } catch (error) {
      toast.error('Failed to update 2FA settings');
    }
  };

  const resetSetup = () => {
    setVerificationCode('');
    setCodeSent(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEnabled ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <Shield className="h-5 w-5 text-gray-400" />
          )}
          Two-Factor Authentication
          {isEnabled && (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Enabled
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Add an extra layer of security to your account by requiring a verification code 
          sent to your email when you log in.
        </p>

        {isEnabled ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Two-factor authentication is currently enabled for your account.
              </AlertDescription>
            </Alert>
            
            <Button
              variant="destructive"
              onClick={() => handleToggle2FA(false)}
            >
              Disable 2FA
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your account is not protected by two-factor authentication. 
                We recommend enabling it for better security.
              </AlertDescription>
            </Alert>

            <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetSetup}>
                  Enable 2FA
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Enable Two-Factor Authentication
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    We'll send a verification code to your email address. 
                    Enter the code below to enable 2FA.
                  </p>

                  {!codeSent ? (
                    <Button
                      onClick={handleGenerate2FA}
                      disabled={isGenerating}
                      className="w-full"
                    >
                      {isGenerating ? 'Sending...' : 'Send Verification Code'}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <Alert>
                        <Mail className="h-4 w-4" />
                        <AlertDescription>
                          A verification code has been sent to your email. 
                          Please check your inbox and enter the code below.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-2">
                        <Label htmlFor="code">Verification Code</Label>
                        <Input
                          id="code"
                          type="text"
                          placeholder="Enter 6-digit code"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          maxLength={6}
                          className="text-center text-lg tracking-widest"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleVerify2FA}
                          disabled={isVerifying || !verificationCode.trim()}
                          className="flex-1"
                        >
                          {isVerifying ? 'Verifying...' : 'Verify & Enable'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleGenerate2FA}
                          disabled={isGenerating}
                        >
                          Resend
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
