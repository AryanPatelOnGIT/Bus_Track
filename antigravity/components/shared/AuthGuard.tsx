'use client';

import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from './LoadingScreen';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRole: 'admin' | 'driver' | 'passenger';
}

export default function AuthGuard({ children, allowedRole }: AuthGuardProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (userData && userData.role !== allowedRole && userData.role !== 'admin') {
        router.push('/');
      }
    }
  }, [user, userData, loading, allowedRole, router]);

  if (loading || !user || !userData) {
    return <LoadingScreen />;
  }

  if (userData.role !== allowedRole && userData.role !== 'admin') {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
