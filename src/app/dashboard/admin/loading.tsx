import { DashboardSkeleton } from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <main className="dashboard-main-content" style={{ minHeight: '100vh', padding: '36px' }}>
      <DashboardSkeleton />
    </main>
  );
}
