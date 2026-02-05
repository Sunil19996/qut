"use client";

import { useAuth } from '@/context/auth-context';
import { MasterDashboard } from './components/master-dashboard';
import { FollowerDashboard } from './components/follower-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);

  // Handle OAuth callback if query params present
  useEffect(() => {
    const authCode = searchParams.get('authCode');
    const userId = searchParams.get('userId');

    if (authCode && userId && !processing) {
      setProcessing(true);
      // Process OAuth callback by calling our callback endpoint
      fetch(`/aliceblue/callback?authCode=${encodeURIComponent(authCode)}&userId=${encodeURIComponent(userId)}`)
        .then(() => {
          // Callback processed, redirect to clean dashboard URL
          router.replace('/dashboard');
        })
        .catch((err) => {
          console.error('OAuth callback processing failed:', err);
          setProcessing(false);
        });
    }
  }, [searchParams, processing, router]);

  if (loading || !user || processing) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (user.role === 'master') {
    return <MasterDashboard />;
  }

  // OAuth trader users see master dashboard with their Alice Blue trades
  if (user.role === 'trader' && user.authMethod === 'oauth') {
    return <MasterDashboard />;
  }

  return <FollowerDashboard />;
}
