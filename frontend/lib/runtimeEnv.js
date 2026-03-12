function getHostName() {
  if (typeof window === 'undefined') return '';
  return String(window.location.hostname || '').toLowerCase();
}

export function getRuntimeEnvFlags() {
  const host = getHostName();
  const isDemo = host.includes('svp.demo');
  const isStage = host.includes('svp.stage');
  const isUat = host.includes('svp.uat');
  const isProd = host.includes('pacc.sa');
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('qiwa.info');

  return {
    host,
    isDemo,
    isStage,
    isUat,
    isProd,
    isLocal,
    isDevelopment: isDemo || isStage || isLocal,
    isProduction: isUat || isProd,
  };
}

export function resolveRecaptchaSiteKey() {
  const envKey = (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '').trim();
  if (envKey) return envKey;

  // Public key observed from SVP frontend config.
  return '6LdhZ_IUAAAAABjY17EoRq8fLJSj8dtNgcMeddrr';
}

