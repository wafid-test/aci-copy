import { env } from '../config/env.js';
const isProd = env.NODE_ENV === 'production';
export function setAuthCookie(res, token) {
    res.cookie(env.COOKIE_NAME, token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
    });
}
export function clearAuthCookie(res) {
    res.clearCookie(env.COOKIE_NAME, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/'
    });
}
export function setApprovedCookie(res, approved) {
    res.cookie('approved', approved ? 'true' : 'false', {
        httpOnly: false,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
    });
}
export function clearApprovedCookie(res) {
    res.clearCookie('approved', {
        httpOnly: false,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/'
    });
}
