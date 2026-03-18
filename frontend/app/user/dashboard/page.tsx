'use client';

import AuthGate from '../../../components/AuthGate';
import RoleGuard from '../../../components/RoleGuard';
import { logout } from '../../../lib/access-api';

export default function Page() {
  return (
    <AuthGate>
      <RoleGuard role="USER">
        <div style={{ padding: 24 }}>
          <h1>User Dashboard</h1>
          <p>Your account is approved and active.</p>
          <button onClick={async () => await logout()}>Logout</button>
        </div>
      </RoleGuard>
    </AuthGate>
  );
}