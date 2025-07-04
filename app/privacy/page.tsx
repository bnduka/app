
import { Shield, Lock, Eye, Database, Users, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - BGuard Suite TMaaS',
  description: 'Learn how BGuard Suite protects your privacy and handles your data. Our comprehensive privacy policy and data protection practices.',
  keywords: 'privacy policy, data protection, GDPR compliance, data security, privacy practices'
};

export default function PrivacyPage() {
  const dataTypes = [
    {
      icon: Users,
      title: 'Account Information',
      description: 'Name, email address, company details, and authentication credentials'
    },
    {
      icon: FileText,
      title: 'Threat Model Data',
      description: 'Application diagrams, security findings, reports, and assessment results'
    },
    {
      icon: Database,
      title: 'Usage Analytics',
      description: 'Platform usage statistics, feature interactions, and performance metrics'
    },
    {
      icon: Lock,
      title: 'Security Logs',
      description: 'Authentication events, access logs, and security monitoring data'
    }
  ];

  const protectionMeasures = [
    'End-to-end encryption for data in transit',
    'AES-256 encryption for data at rest',
    'Multi-factor authentication support',
    'Regular security audits and penetration testing',
    'SOC 2 Type II compliance',
    'GDPR and CCPA compliance',
    'Role-based access controls',
    '24/7 security monitoring'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gradient">BGuard Suite TMaaS</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Button variant="outline" asChild>
                <Link href="/">Back to Home</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-6">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Your privacy is our priority. Learn how we collect, use, and protect your data.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Last updated: January 15, 2025
          </p>
        </div>
      </section>

      {/* Overview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gradient mb-4">Our Commitment to Privacy</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              At BGuard Suite, we understand that your data is valuable and sensitive. We're committed 
              to protecting your privacy and being transparent about our data practices.
            </p>
          </div>

          <div className="prose prose-lg max-w-none text-gray-600">
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Introduction</h3>
            <p className="mb-6">
              This Privacy Policy describes how BGuard Suite ("we," "our," or "us") collects, uses, 
              and protects your personal information when you use our threat modeling platform and services. 
              By using our services, you agree to the collection and use of information in accordance with this policy.
            </p>

            <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Information We Collect</h3>
            <p className="mb-6">
              We collect information to provide better services to our users. The types of information 
              we collect depend on how you use our services.
            </p>
          </div>
        </div>
      </section>

      {/* Data Types */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gradient mb-4">Types of Data We Collect</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {dataTypes.map((type, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow border-0 shadow-md">
                <CardHeader>
                  <type.icon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <CardTitle className="text-lg">{type.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {type.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How We Use Data */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gradient mb-8 text-center">How We Use Your Information</h2>
          
          <div className="prose prose-lg max-w-none text-gray-600 space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Service Provision</h3>
              <p>We use your information to provide, maintain, and improve our threat modeling services, including processing your threat models and generating security reports.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Communication</h3>
              <p>We may use your contact information to send you service updates, security alerts, and respond to your inquiries.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Platform Improvement</h3>
              <p>We analyze usage patterns to enhance our platform's functionality and user experience, always using aggregated and anonymized data.</p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Security</h3>
              <p>We monitor and analyze security logs to protect our platform and users from threats, fraud, and unauthorized access.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Protection */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gradient mb-4">How We Protect Your Data</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We implement industry-leading security measures to protect your information
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {protectionMeasures.map((measure, index) => (
              <div key={index} className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Lock className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{measure}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rights and Controls */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gradient mb-8 text-center">Your Rights and Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <Eye className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>Access and Portability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  You can access, update, or export your personal data at any time through your account settings 
                  or by contacting our support team.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <Database className="h-8 w-8 text-purple-600 mb-2" />
                <CardTitle>Data Deletion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  You can request deletion of your personal data. We'll honor your request while 
                  retaining necessary information for legal compliance.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <Users className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle>Consent Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  You can withdraw consent for optional data processing activities at any time 
                  through your privacy settings.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md">
              <CardHeader>
                <FileText className="h-8 w-8 text-orange-600 mb-2" />
                <CardTitle>Data Correction</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  You have the right to correct inaccurate personal information and update 
                  your profile data at any time.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact and Updates */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none text-gray-600 space-y-6">
            <h2 className="text-3xl font-bold text-gradient text-center mb-8">Contact Us About Privacy</h2>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
              <p className="mb-4">
                If you have questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <ul className="space-y-2">
                <li><strong>Email:</strong> privacy@bguard.com</li>
                <li><strong>Address:</strong> BGuard Suite Privacy Team, San Francisco, CA, USA</li>
                <li><strong>Data Protection Officer:</strong> dpo@bguard.com</li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Policy Updates</h3>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page and updating the "Last updated" date. 
                We encourage you to review this Privacy Policy periodically for any changes.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">International Data Transfers</h3>
              <p>
                Your information may be transferred to and processed in countries other than your own. 
                We ensure that such transfers comply with applicable data protection laws and implement 
                appropriate safeguards to protect your personal information.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Questions About Privacy?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Our privacy team is here to help you understand how we protect your data
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 font-semibold" asChild>
              <Link href="/contact">Contact Privacy Team</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-purple-600" asChild>
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
