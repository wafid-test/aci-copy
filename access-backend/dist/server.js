import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env, envIssues } from './config/env.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { agencyRouter } from './routes/agency.js';
const app = express();
const allowedOrigins = (env.FRONTEND_URLS || env.FRONTEND_URL)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests without Origin header (curl/postman/server-to-server).
        if (!origin) {
            callback(null, true);
            return;
        }
        callback(null, allowedOrigins.includes(origin));
    },
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.get('/', (_req, res) => {
    res.json({ message: 'Access Backend Running' });
});
app.get('/health', (_req, res) => {
    if (envIssues.length > 0) {
        res.status(503).json({ ok: false, issues: envIssues });
        return;
    }
    res.json({ ok: true });
});
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/agency', agencyRouter);
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
});
app.listen(env.PORT, () => {
    if (envIssues.length > 0) {
        console.warn(`Access backend started with degraded config: ${envIssues.join('; ')}`);
    }
    console.log(`Access backend listening on http://localhost:${env.PORT}`);
});
