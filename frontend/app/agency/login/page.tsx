'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../../lib/access-api';

export default function Page() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    try {
      const res = await login({ email, password });
      if (res?.user?.role === 'AGENCY') {
        router.push('/agency/dashboard');
      } else {
        setError('Not agency');
      }
    } catch {
      setError('Login failed');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Agency Login</h1>
      <input placeholder="email" onChange={(e) => setEmail(e.target.value)} />
      <br />
      <input placeholder="password" type="password" onChange={(e) => setPassword(e.target.value)} />
      <br />
      <button onClick={handleLogin}>Login</button>
      {error ? <p>{error}</p> : null}
    </div>
  );
}