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
      if (res?.user?.role === 'USER') {
        router.push('/dashboard');
      } else {
        setError('Not user');
      }
    } catch {
      setError('Login failed');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>User Login</h1>
      <input placeholder="email" onChange={(e) => setEmail(e.target.value)} />
      <br />
      <input placeholder="password" type="password" onChange={(e) => setPassword(e.target.value)} />
      <br />
      <button onClick={handleLogin}>Login</button>
      {error ? <p>{error}</p> : null}
    </div>
  );
}
