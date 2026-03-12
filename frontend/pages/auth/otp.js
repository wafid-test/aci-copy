import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import RecaptchaWidget from '../../components/RecaptchaWidget';

export default function Otp() {
  const router = useRouter();
  const { login: queryLogin, password: queryPassword, otpMethod: queryOtpMethod } = router.query;

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [otpMethod, setOtpMethod] = useState('email');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [otpAttempt, setOtpAttempt] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const storedLogin = typeof window !== 'undefined' ? sessionStorage.getItem('tmp_login') : '';
    const storedPassword = typeof window !== 'undefined' ? sessionStorage.getItem('tmp_password') : '';
    const storedOtpMethod = typeof window !== 'undefined' ? sessionStorage.getItem('tmp_otpMethod') : 'email';
    const storedRecaptcha = typeof window !== 'undefined' ? sessionStorage.getItem('tmp_recaptcha') : '';

    setLogin(String(queryLogin || storedLogin || ''));
    setPassword(String(queryPassword || storedPassword || ''));
    setOtpMethod(String(queryOtpMethod || storedOtpMethod || 'email'));
    setRecaptchaToken(String(storedRecaptcha || ''));
  }, [queryLogin, queryPassword, queryOtpMethod]);

  async function verify(e) {
    e.preventDefault();
    setMsg('Verifying...');
    try {
      const res = await api('/api/auth/otp-verify', {
        method: 'POST',
        body: {
          login,
          password,
          otpAttempt,
          otpMethod,
          ...(recaptchaToken ? { recaptchaToken } : {}),
        },
      });

      localStorage.setItem('accessToken', res.accessToken);
      sessionStorage.removeItem('tmp_login');
      sessionStorage.removeItem('tmp_password');
      sessionStorage.removeItem('tmp_otpMethod');
      sessionStorage.removeItem('tmp_recaptcha');

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
          <label>Recaptcha</label>
          <RecaptchaWidget onToken={setRecaptchaToken} />

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
