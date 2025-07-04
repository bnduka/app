
import { Metadata } from 'next';
import { EnhancedWizardWorkflow } from '@/components/threat-modeling/enhanced-wizard-workflow';

export const metadata: Metadata = {
  title: 'New Threat Model - BGuard Suite',
  description: 'Create comprehensive threat models with AI-powered analysis and document processing.',
};

export default function NewThreatModelPage() {
  return <EnhancedWizardWorkflow />;
}
