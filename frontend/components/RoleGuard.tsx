'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe } from '../lib/access-api';

type Role = 'ADMIN' | 'AGENCY' | 'USER';

export default function RoleGuard({ children, role }: { children: React.ReactNode; role: Role }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getMe().then((res) => {
      if (!mounted) return;

      const user = res?.user;
      if (!user || user.role !== role) {
        router.replace('/login');
        return;
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [role, router]);

  if (loading) return <div>Checking role...</div>;

  return <>{children}</>;
}