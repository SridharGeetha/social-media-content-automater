import { auth } from '@/auth';
import LandingGallery from '@/components/LandingGallery';

export default async function LandingPage() {
  const session = await auth();
  const user = session?.user;

  let dashboardHref = '/login';
  if (user?.role === 'ADMIN') dashboardHref = '/dashboard/admin';
  else if (user?.role === 'MANAGER') dashboardHref = '/dashboard/manager';
  else if (user?.role === 'CREATOR') dashboardHref = '/dashboard/creator';

  return <LandingGallery dashboardHref={dashboardHref} userRole={user?.role ?? null} />;
}
