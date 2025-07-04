
import { Metadata } from 'next';
import { DesignReviewContent } from '@/components/design-reviews/design-review-content';

export const metadata: Metadata = {
  title: 'Design Reviews - BGuard Suite',
  description: 'Perform comprehensive security design reviews with AI-powered analysis.',
};

export default function DesignReviewsPage() {
  return <DesignReviewContent />;
}
