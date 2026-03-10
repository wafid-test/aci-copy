import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';

export default function Otp() {
  const router = useRouter();
  const { login: queryLogin, password: queryPassword, otpMethod: queryOtpMethod } = router.query;

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [otpMethod, setOtpMethod] = useState('email');
  const [otpAttempt, setOtpAttempt] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const storedLogin = typeof window !== 'undefined' ? sessionStorage.getItem('tmp_login') : '';
    const storedPassword = typeof window !== 'undefined' ? sessionStorage.getItem('tmp_password') : '';
    const storedOtpMethod = typeof window !== 'undefined' ? sessionStorage.getItem('tmp_otpMethod') : 'email';

    setLogin(String(queryLogin || storedLogin || ''));
    setPassword(String(queryPassword || storedPassword || ''));
    setOtpMethod(String(queryOtpMethod || storedOtpMethod || 'email'));
  }, [queryLogin, queryPassword, queryOtpMethod]);

  async function verify(e) {
    e.preventDefault();
    setMsg('Verifying...');
    try {
      const res = await api('/api/auth/otp-verify', {
        method: 'POST',
        body: { login, password, otpAttempt, otpMethod },
      });

      localStorage.setItem('accessToken', res.accessToken);
      sessionStorage.removeItem('tmp_login');
      sessionStorage.removeItem('tmp_password');
      sessionStorage.removeItem('tmp_otpMethod');

      setMsg('Login successful. Redirecting to dashboard...');
      router.push('/dashboard');
    } catch (err) {
      setMsg(JSON.stringify(err.data || err.message));
    }
  }

  return (
    <div className="container">
      <h2>OTP Verify</h2>
      <div className="card">
        <p className="small">Login: {String(login || '')}</p>
        <form onSubmit={verify}>
          <label>OTP Code</label>
          <input value={otpAttempt} onChange={(e) => setOtpAttempt(e.target.value)} required />
          <button type="submit">Verify OTP</button>
        </form>
        <p className="small">{msg}</p>
      </div>
    </div>
  );
}
