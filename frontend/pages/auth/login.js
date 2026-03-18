import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import AuthGate from '../../components/AuthGate';

function ExistingLoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [otpMethod, setOtpMethod] = useState('email');
  const [msg, setMsg] = useState('');
  const [tokenLogin, setTokenLogin] = useState('');
  const [svpToken, setSvpToken] = useState('');
  const [tokenMsg, setTokenMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    const portalLogin = typeof window !== 'undefined' ? sessionStorage.getItem('portal_login') : '';
    const portalPassword = typeof window !== 'undefined' ? sessionStorage.getItem('portal_password') : '';

    setLogin(String(portalLogin || ''));
    setPassword(String(portalPassword || ''));
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    setMsg('Sending OTP...');
    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: {
          login,
          password,
          otpMethod,
        },
      });

      sessionStorage.setItem('tmp_login', login);
      sessionStorage.setItem('tmp_password', password);
      sessionStorage.setItem('tmp_otpMethod', otpMethod);

      setMsg('OTP sent. Check your email or SMS.');
      router.push('/auth/otp');
    } catch (err) {
      setMsg(JSON.stringify(err.data || err.message));
    }
  }

  async function submitToken(e) {
    e.preventDefault();
    setTokenMsg('Verifying bearer token...');
    try {
      const res = await api('/api/auth/token-login', {
        method: 'POST',
        body: {
          login: tokenLogin,
          token: svpToken,
        },
      });
      localStorage.setItem('accessToken', res.accessToken);
      setTokenMsg('Login successful. Redirecting...');
      router.push('/dashboard');
    } catch (err) {
      setTokenMsg(JSON.stringify(err.data || err.message));
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-heading">
          <h1>Welcome back</h1>
          <p>Sign in with your SVP account and request OTP verification.</p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>Email</label>
          <input
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="Enter your email"
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          <label>OTP Verify Option</label>
          <select value={otpMethod} onChange={(e) => setOtpMethod(e.target.value)}>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>

          <button type="submit" className="auth-submit">Sign in</button>
          <p className="auth-message">{msg}</p>
        </form>

        <div className="auth-heading" style={{ marginTop: '1rem' }}>
          <h2>Direct Token Login</h2>
          <p>Paste your SVP bearer token from official login and login instantly.</p>
        </div>

        <form className="auth-form" onSubmit={submitToken}>
          <label>Account login (email)</label>
          <input
            value={tokenLogin}
            onChange={(e) => setTokenLogin(e.target.value)}
            placeholder="Enter your email or login"
            required
          />

          <label>SVP Bearer Token</label>
          <textarea
            value={svpToken}
            onChange={(e) => setSvpToken(e.target.value)}
            placeholder="Paste bearer token from official SVP session"
            rows={4}
            required
          />

          <button type="submit" className="auth-submit">Login with token</button>
          <p className="auth-message">{tokenMsg}</p>
        </form>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <ExistingLoginPage />
    </AuthGate>
  );
}
