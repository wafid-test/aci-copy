import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import { executeRecaptcha } from '../../lib/recaptcha';

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
    setMsg('Verifying OTP...');
    try {
      const recaptchaResponse = await executeRecaptcha('svp_otp_verify');
      const res = await api('/api/auth/otp-verify', {
        method: 'POST',
        body: {
          login,
          password,
          otpAttempt,
          otpMethod,
          recaptchaResponse,
        },
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
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-heading">
          <h1>OTP verification</h1>
          <p>Enter the OTP sent to your selected method and complete sign in.</p>
        </div>

        <div className="auth-meta">
          <span>Account</span>
          <strong>{String(login || '')}</strong>
          <span>Verify by</span>
          <strong>{String(otpMethod || '').toUpperCase()}</strong>
        </div>

        <form className="auth-form" onSubmit={verify}>
          <label>OTP Code</label>
          <input
            value={otpAttempt}
            onChange={(e) => setOtpAttempt(e.target.value)}
            placeholder="Enter OTP code"
            required
          />

          <button type="submit" className="auth-submit">Verify OTP</button>
          <p className="auth-message">{msg}</p>
        </form>
      </div>
    </div>
  );
}
