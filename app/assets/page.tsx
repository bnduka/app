
import { Metadata } from 'next';
import { AssetManagementContent } from '@/components/assets/asset-management-content';

export const metadata: Metadata = {
  title: 'Asset Management - BGuard Suite',
  description: 'Manage and catalog your application assets with comprehensive security tracking.',
};

export default function AssetsPage() {
  return <AssetManagementContent />;
}
