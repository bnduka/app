
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DemoSchedulingModal } from '@/components/demo/demo-scheduling-modal';
import { Footer } from '@/components/layout/footer';
import { NavBar } from '@/components/layout/nav-bar';
import { toast } from 'sonner';
import {
  Shield,
  Search,
  FileText,
  Users,
  Zap,
  CheckCircle,
  ArrowRight,
  Globe,
  Lock,
  Activity,
  BarChart3,
  AlertTriangle,
  Info,
  Layers,
  Eye,
  CheckSquare,
  Target,
  Award,
  Clock,
  TrendingUp
} from 'lucide-react';

function HomePageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionExpired = searchParams.get('session');
  useEffect(() => {
    // Handle session expiry notification
    if (sessionExpired === 'expired') {
      toast.error('Your session has expired. Please sign in again.');
    }
  }, [sessionExpired]);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.push('/dashboard');
    }
  }, [status, session, router]);

  // Core modules of the BGuard Suite
  const modules = [
    {
      icon: Shield,
      title: 'AI-Powered Threat Modeling',
      description: 'Intelligent threat analysis using STRIDE methodology, OWASP alignment, and NIST SP 800-53 framework integration with automated CVSS scoring.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      link: '/threat-models'
    },
    {
      icon: Layers,
      title: 'Comprehensive Asset Management',
      description: 'Track and manage your digital assets with automated discovery, risk assessment, and compliance monitoring across your entire infrastructure.',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      link: '/assets'
    },
    {
      icon: Eye,
      title: 'Secure Design Review',
      description: 'Analyze application architectures and designs for security vulnerabilities before development, ensuring security by design principles.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      link: '/design-reviews'
    },
    {
      icon: CheckSquare,
      title: 'Third-Party Assessment',
      description: 'Evaluate vendor applications and third-party tools for security compliance, risk assessment, and integration safety.',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      link: '/third-party-reviews'
    }
  ];

  const features = [
    {
      icon: Target,
      title: 'STRIDE & OWASP Integration',
      description: 'Built-in support for STRIDE threat modeling methodology and OWASP Top 10 security risks with automated mapping.',
      color: 'text-blue-600'
    },
    {
      icon: Award,
      title: 'Compliance Standards',
      description: 'Align with NIST SP 800-53, ISO 27001, SOC 2, and other industry standards with automated compliance reporting.',
      color: 'text-green-600'
    },
    {
      icon: BarChart3,
      title: 'Automated CVSS Scoring',
      description: 'Intelligent vulnerability assessment with automated CVSS scoring and risk prioritization for efficient remediation.',
      color: 'text-purple-600'
    },
    {
      icon: Clock,
      title: 'Streamlined Workflows',
      description: 'Integrated platform bringing together all AppSec functions in one place, reducing context switching and improving efficiency.',
      color: 'text-orange-600'
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics',
      description: 'Real-time security metrics, trend analysis, and executive dashboards for data-driven security decisions.',
      color: 'text-red-600'
    },
    {
      icon: Users,
      title: '2FA & Role-Based Access',
      description: 'Enterprise-grade security with two-factor authentication, granular permissions, and audit trails.',
      color: 'text-indigo-600'
    }
  ];

  const benefits = [
    'Modernize your entire AppSec program with one integrated platform',
    'Reduce security assessment time by up to 70% with AI automation',
    'Standardize threat modeling, asset management, and design reviews',
    'Ensure compliance with NIST SP 800-53, ISO 27001, and SOC 2',
    'Track assets, findings, and reviews with centralized SLA management',
    'Generate professional reports instantly across all security modules',
    'Streamline vendor assessments and third-party security evaluations',
    'Integrate seamlessly with existing security workflows and tools'
  ];

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't show home page content to authenticated users (they get redirected)
  if (status === 'authenticated') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Session Expiry Alert */}
      {sessionExpired === 'expired' && (
        <div className="bg-red-50 border-b border-red-200 p-4">
          <Alert variant="destructive" className="max-w-6xl mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your session has expired due to inactivity. Please sign in again to continue.
            </AlertDescription>
          </Alert>
        </div>
      )}



      {/* Unified Navigation */}
      <NavBar />

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge className="px-4 py-2 bg-blue-100 text-blue-800 hover:bg-blue-200">
                <Zap className="w-4 h-4 mr-2" />
                Comprehensive AppSec Platform
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold text-gradient">
                Modernize Your AppSec Program
                <span className="block text-purple-600">All in One Place</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Intelligent platform bringing together AI-powered threat modeling, asset management, 
                secure design reviews, and third-party assessments with STRIDE, OWASP, and NIST SP 800-53 alignment.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-4 bg-purple-600 hover:bg-purple-700 font-semibold" asChild>
                <Link href="/register">
                  Register
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <DemoSchedulingModal>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8 py-4 border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white dark:border-purple-400 dark:text-purple-400 dark:hover:bg-purple-400 dark:hover:text-gray-900"
                >
                  Schedule a Demo
                </Button>
              </DemoSchedulingModal>
            </div>

            <div className="flex items-center justify-center space-x-8 text-sm text-gray-500">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                7-day free trial
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Enterprise ready
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Modules Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gradient">
              Four Powerful Security Modules
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need for comprehensive application security management in one integrated platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {modules.map((module, index) => (
              <Card 
                key={index}
                className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:scale-105 overflow-hidden"
              >
                <CardHeader className={`${module.bgColor} pb-6`}>
                  <div className="flex items-center space-x-4">
                    <module.icon className={`h-12 w-12 ${module.color} group-hover:scale-110 transition-transform`} />
                    <div className="flex-1">
                      <CardTitle className="text-xl font-semibold text-gray-800">
                        {module.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <CardDescription className="text-gray-600 leading-relaxed mb-4">
                    {module.description}
                  </CardDescription>
                  <Button 
                    variant="outline" 
                    className={`w-full ${module.color} border-current hover:bg-current hover:text-white transition-colors`}
                    asChild
                  >
                    <Link href={module.link}>
                      Explore Module
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gradient">
              Advanced Security Capabilities
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built on industry standards with AI automation and enterprise-grade security features
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md hover:scale-105"
              >
                <CardHeader>
                  <feature.icon className={`h-12 w-12 ${feature.color} mb-4 group-hover:scale-110 transition-transform`} />
                  <CardTitle className="text-xl font-semibold">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-gradient">
                Why Choose BGuard Suite?
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Our intelligent platform modernizes your entire AppSec program by bringing together 
                threat modeling, asset management, design reviews, and vendor assessments in one 
                comprehensive solution with AI automation and industry standard compliance.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>

            </div>

            <Card className="lg:ml-8 shadow-xl border-0">
              <CardHeader className="text-center">
                <Globe className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle className="text-2xl">Enterprise Ready</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <BarChart3 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="font-semibold">Advanced Analytics</div>
                    <div className="text-sm text-gray-600">Real-time insights</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="font-semibold">SOC 2 Compliant</div>
                    <div className="text-sm text-gray-600">Enterprise security</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="font-semibold">Team Collaboration</div>
                    <div className="text-sm text-gray-600">Role-based access</div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <Zap className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <div className="font-semibold">API Integration</div>
                    <div className="text-sm text-gray-600">Seamless workflow</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Modernize Your AppSec Program?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join leading organizations using BGuard Suite for comprehensive application security management
          </p>
          <div className="flex justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-4 bg-white text-purple-600 hover:bg-gray-100 font-semibold"
              asChild
            >
              <Link href="/register">
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />


    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>}>
      <HomePageContent />
    </Suspense>
  );
}
