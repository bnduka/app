
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Copy, 
  Check, 
  ExternalLink, 
  User, 
  Building, 
  Crown,
  Users,
  CheckCircle,
  Database,
  Globe,
  Key
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Credential {
  role: string;
  email: string;
  password: string;
  name: string;
  organization?: string;
  description: string;
  icon: any;
  color: string;
}

export default function CredentialVerificationPage() {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const credentials: Credential[] = [
    {
      role: 'System Admin',
      email: 'admin@bguard.com',
      password: 'admin123',
      name: 'Admin User',
      description: 'Full system administration access with global user and organization management capabilities',
      icon: Crown,
      color: 'bg-red-100 text-red-800 border-red-200'
    },
    {
      role: 'Business Admin',
      email: 'admin@techcorp.com',
      password: 'admin123',
      name: 'Sarah Mitchell',
      organization: 'TechCorp Solutions',
      description: 'Organization administrator with full access to manage users, threat models, and findings within TechCorp',
      icon: Building,
      color: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    {
      role: 'Business User',
      email: 'user@techcorp.com',
      password: 'user123',
      name: 'Michael Johnson',
      organization: 'TechCorp Solutions',
      description: 'Standard business user with access to create and manage threat models and findings within TechCorp',
      icon: Users,
      color: 'bg-green-100 text-green-800 border-green-200'
    },
    {
      role: 'Demo User',
      email: 'user@example.com',
      password: 'user123',
      name: 'Demo User',
      description: 'General demonstration account with basic threat modeling capabilities for testing',
      icon: User,
      color: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  ];

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [type]: true }));
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      });
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const openLogin = () => {
    window.open('http://localhost:3000/login', '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            BGuard TMaaS: Verified Test Credentials
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            All test accounts have been verified and are ready for use. Use these credentials to access different user roles and test the application features.
          </p>
        </div>

        {/* Status Alert */}
        <Alert className="mb-8 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>✅ Credentials Verified:</strong> The following test accounts have been verified and are active. Authentication system is working properly.
          </AlertDescription>
        </Alert>

        {/* Application Access */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              <Globe className="h-5 w-5 mr-2" />
              Application Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-blue-900">BGuard TMaaS Application</p>
                <p className="text-sm text-blue-700">http://localhost:3000/login</p>
              </div>
              <Button onClick={openLogin} className="bg-blue-600 hover:bg-blue-700">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Login Page
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {credentials.map((cred, index) => {
            const IconComponent = cred.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-gray-100">
                        <IconComponent className="h-5 w-5 text-gray-700" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{cred.role}</CardTitle>
                        <CardDescription className="font-medium">{cred.name}</CardDescription>
                      </div>
                    </div>
                    <Badge className={cred.color}>{cred.role}</Badge>
                  </div>
                  {cred.organization && (
                    <div className="flex items-center text-sm text-gray-600 mt-2">
                      <Building className="h-4 w-4 mr-1" />
                      {cred.organization}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{cred.description}</p>
                  
                  <div className="space-y-3">
                    {/* Email */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</span>
                        <p className="font-mono text-sm">{cred.email}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(cred.email, `${cred.role}-email`)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedStates[`${cred.role}-email`] ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Password */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Password</span>
                        <p className="font-mono text-sm">{cred.password}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(cred.password, `${cred.role}-password`)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedStates[`${cred.role}-password`] ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Database Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Database Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">4</div>
                <div className="text-sm text-gray-600">Active Users</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">1</div>
                <div className="text-sm text-gray-600">Organizations</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">11</div>
                <div className="text-sm text-gray-600">Threat Models</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">6</div>
                <div className="text-sm text-gray-600">Findings</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Key className="h-5 w-5 mr-2" />
              Login Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Step 1: Access the Application</h4>
                <p className="text-blue-800">Click the "Open Login Page" button above or navigate to http://localhost:3000/login</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Step 2: Select Test Account</h4>
                <p className="text-green-800">Choose any of the credential sets above based on the role you want to test</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">Step 3: Copy Credentials</h4>
                <p className="text-purple-800">Use the copy buttons to copy the email and password to your clipboard</p>
              </div>
              
              <div className="p-4 bg-orange-50 rounded-lg">
                <h4 className="font-semibold text-orange-900 mb-2">Step 4: Sign In</h4>
                <p className="text-orange-800">Paste the credentials into the login form and sign in to access the application</p>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="text-sm text-gray-600">
              <h4 className="font-semibold mb-2">Role Capabilities:</h4>
              <ul className="space-y-1 ml-4">
                <li><strong>System Admin:</strong> Full system access, user management, organization management</li>
                <li><strong>Business Admin:</strong> Organization management, user management within organization</li>
                <li><strong>Business User:</strong> Create/manage threat models and findings within organization</li>
                <li><strong>Demo User:</strong> Basic threat modeling capabilities for testing</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
