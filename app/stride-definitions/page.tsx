
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  UserCheck, 
  FileX, 
  Eye, 
  ServerCrash, 
  Crown,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

const strideCategories = [
  {
    id: 'SPOOFING',
    name: 'Spoofing',
    icon: UserCheck,
    description: 'Threats involving impersonation of users, processes, or systems',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    iconColor: 'text-red-600 dark:text-red-400',
    examples: [
      'An attacker impersonates a legitimate user by stealing credentials',
      'Masquerading as a trusted system component or service',
      'Email spoofing or phishing attacks',
      'IP address spoofing in network communications',
      'DNS spoofing to redirect traffic to malicious servers'
    ],
    countermeasures: [
      'Strong authentication mechanisms (multi-factor authentication)',
      'Digital certificates and public key infrastructure (PKI)',
      'Secure communication protocols (TLS/SSL)',
      'Identity verification and authorization controls',
      'Regular security awareness training for users'
    ]
  },
  {
    id: 'TAMPERING',
    name: 'Tampering',
    icon: FileX,
    description: 'Threats involving unauthorized modification of data or systems',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    iconColor: 'text-orange-600 dark:text-orange-400',
    examples: [
      'Modifying data in transit or at rest without authorization',
      'Altering configuration files or system settings',
      'Code injection attacks (SQL injection, XSS)',
      'Man-in-the-middle attacks modifying communications',
      'Unauthorized changes to database records or files'
    ],
    countermeasures: [
      'Data integrity checks (checksums, digital signatures)',
      'Access controls and least privilege principles',
      'Input validation and sanitization',
      'Secure coding practices',
      'Version control and change management processes'
    ]
  },
  {
    id: 'REPUDIATION',
    name: 'Repudiation',
    description: 'Threats involving denial of actions or transactions',
    icon: Eye,
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    examples: [
      'Users denying they performed certain actions',
      'Lack of audit trails for critical operations',
      'Inability to prove transaction authenticity',
      'Missing or incomplete logging of user activities',
      'Disputes over data access or modification claims'
    ],
    countermeasures: [
      'Comprehensive audit logging and monitoring',
      'Digital signatures for non-repudiation',
      'Time-stamping of transactions and activities',
      'Secure log storage and protection',
      'Regular log analysis and review processes'
    ]
  },
  {
    id: 'INFORMATION_DISCLOSURE',
    name: 'Information Disclosure',
    icon: Eye,
    description: 'Threats involving unauthorized access to sensitive information',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    iconColor: 'text-purple-600 dark:text-purple-400',
    examples: [
      'Unauthorized access to confidential data',
      'Data leakage through insecure channels',
      'Information exposure through error messages',
      'Eavesdropping on network communications',
      'Inadvertent disclosure through logs or debug information'
    ],
    countermeasures: [
      'Data encryption at rest and in transit',
      'Access controls and role-based permissions',
      'Data loss prevention (DLP) solutions',
      'Secure error handling and logging',
      'Regular security assessments and penetration testing'
    ]
  },
  {
    id: 'DENIAL_OF_SERVICE',
    name: 'Denial of Service',
    icon: ServerCrash,
    description: 'Threats involving disruption of system availability and performance',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    iconColor: 'text-blue-600 dark:text-blue-400',
    examples: [
      'Overwhelming systems with excessive requests (DDoS)',
      'Resource exhaustion attacks (memory, CPU, disk)',
      'Network flooding and bandwidth consumption',
      'Application-layer attacks targeting specific services',
      'Physical attacks on infrastructure components'
    ],
    countermeasures: [
      'Rate limiting and request throttling',
      'Load balancing and redundant systems',
      'DDoS protection services and firewalls',
      'Resource monitoring and alerting',
      'Business continuity and disaster recovery plans'
    ]
  },
  {
    id: 'ELEVATION_OF_PRIVILEGE',
    name: 'Elevation of Privilege',
    icon: Crown,
    description: 'Threats involving unauthorized escalation of system privileges',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    iconColor: 'text-green-600 dark:text-green-400',
    examples: [
      'Exploiting vulnerabilities to gain administrative access',
      'Privilege escalation through system misconfigurations',
      'Buffer overflow attacks leading to code execution',
      'Social engineering to obtain elevated credentials',
      'Abuse of legitimate administrative tools and features'
    ],
    countermeasures: [
      'Principle of least privilege implementation',
      'Regular security patching and updates',
      'Privilege access management (PAM) solutions',
      'Code review and secure development practices',
      'Runtime application security monitoring'
    ]
  }
];

export default function StrideDefinitionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
            <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">STRIDE Threat Categories</h1>
            <p className="text-muted-foreground">
              Comprehensive guide to the STRIDE threat modeling methodology
            </p>
          </div>
        </div>
        
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">About STRIDE</h3>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  STRIDE is a threat modeling methodology developed by Microsoft that categorizes potential 
                  security threats into six main categories. It provides a systematic approach to identifying 
                  and analyzing security vulnerabilities in software systems and applications.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Threat Categories */}
      <div className="space-y-6">
        {strideCategories.map((category, index) => {
          const IconComponent = category.icon;
          return (
            <Card key={category.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <IconComponent className={`h-5 w-5 ${category.iconColor}`} />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{category.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {category.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={category.color}>
                    {category.id.charAt(0)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Examples */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                      Common Examples
                    </h4>
                    <ul className="space-y-2">
                      {category.examples.map((example, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{example}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Countermeasures */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Countermeasures
                    </h4>
                    <ul className="space-y-2">
                      {category.countermeasures.map((measure, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{measure}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                {index < strideCategories.length - 1 && <Separator className="mt-6" />}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer Information */}
      <Card className="bg-gray-50 dark:bg-gray-900/50">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h3 className="font-semibold">Using STRIDE in Threat Modeling</h3>
            <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
              When conducting threat modeling, systematically consider each STRIDE category for every 
              component and data flow in your system. This comprehensive approach helps ensure no 
              potential security threats are overlooked during the analysis process.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
