import { getRuntimeEnvFlags, resolveRecaptchaSiteKey } from './runtimeEnv';

const SCRIPT_ID = 'google-recaptcha-v3-script';

function getSiteKey() {
  return resolveRecaptchaSiteKey();
}

function loadScript(siteKey) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Recaptcha requires browser environment'));
      return;
    }

    if (window.grecaptcha && typeof window.grecaptcha.execute === 'function') {
      resolve(window.grecaptcha);
      return;
    }

    let script = document.getElementById(SCRIPT_ID);
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    let settled = false;
    const done = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    const tryResolve = () => {
      if (window.grecaptcha && typeof window.grecaptcha.ready === 'function') {
        done(resolve, window.grecaptcha);
        return true;
      }
      return false;
    };

    if (tryResolve()) return;

    const onLoad = () => {
      // Script may be loaded but grecaptcha can initialize a bit later.
      const start = Date.now();
      const timer = setInterval(() => {
        if (tryResolve()) {
          clearInterval(timer);
          return;
        }
        if (Date.now() - start > 15000) {
          clearInterval(timer);
          done(reject, new Error('Recaptcha failed to initialize'));
        }
      }, 100);
    };

    const onError = () => done(reject, new Error('Failed to load Recaptcha script'));

    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });

    // If script was already loaded before listeners were attached.
    if (script.readyState === 'complete' || script.readyState === 'loaded') {
      onLoad();
    }
  });
}

export async function executeRecaptcha(action = 'login') {
  const siteKey = getSiteKey();
  if (!siteKey) {
    const { host } = getRuntimeEnvFlags();
    throw new Error(`Missing NEXT_PUBLIC_RECAPTCHA_SITE_KEY (host: ${host || 'unknown'})`);
  }

  const grecaptcha = await loadScript(siteKey);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Recaptcha timed out')), 20000);
    grecaptcha.ready(() => {
      grecaptcha
        .execute(siteKey, { action })
        .then((token) => {
          clearTimeout(timeout);
          if (!token) {
            reject(new Error('Recaptcha token is empty'));
            return;
          }
          resolve(token);
        })
        .catch(() => {
          clearTimeout(timeout);
          reject(new Error('Recaptcha execute failed'));
        });
    });
  });
}
