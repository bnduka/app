
import { Metadata } from 'next';
import { ThirdPartyReviewContent } from '@/components/third-party-reviews/third-party-review-content';

export const metadata: Metadata = {
  title: 'Third-Party Reviews - BGuard Suite',
  description: 'Assess security posture of external applications and SaaS tools.',
};

export default function ThirdPartyReviewsPage() {
  return <ThirdPartyReviewContent />;
}
