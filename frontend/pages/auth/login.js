import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../lib/api';
import RecaptchaWidget from '../../components/RecaptchaWidget';

export default function Login() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [otpMethod, setOtpMethod] = useState('email');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [msg, setMsg] = useState('');
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
          ...(recaptchaToken ? { recaptchaToken } : {}),
        },
      });

      sessionStorage.setItem('tmp_login', login);
      sessionStorage.setItem('tmp_password', password);
      sessionStorage.setItem('tmp_otpMethod', otpMethod);
      if (recaptchaToken) sessionStorage.setItem('tmp_recaptcha', recaptchaToken);

      setMsg('OTP sent. Check your email or SMS.');
      router.push('/auth/otp');
    } catch (err) {
      setMsg(JSON.stringify(err.data || err.message));
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

          <label>Recaptcha</label>
          <RecaptchaWidget onToken={setRecaptchaToken} />

          <button type="submit" className="auth-submit">Sign in</button>
          <p className="auth-message">{msg}</p>
        </form>
      </div>
    </div>
  );
}
