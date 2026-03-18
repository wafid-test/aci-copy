'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe } from '../lib/access-api';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getMe().then((res) => {
      if (!mounted) return;

      const user = res?.user;
      if (!user || user.status !== 'ACTIVE') {
        router.replace('/login');
        return;
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) return <div>Checking access...</div>;

  return <>{children}</>;
}