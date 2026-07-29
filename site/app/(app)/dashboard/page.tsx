import type { Metadata } from 'next';

import { CustomerDashboard } from '@/components/dashboard/customer-dashboard';

export const metadata: Metadata = {
  title: 'دفترك',
  // Nothing here is public and nothing here is the same twice, so there is
  // nothing worth a search result — and an indexed sign-in page competes with
  // the landing page for the brand query.
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <CustomerDashboard />;
}
