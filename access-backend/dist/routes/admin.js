import { AccountStatus, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/password.js';
import { publicAccount } from '../lib/account.js';
import { authRequired, requireRoles } from '../middleware/auth.js';
const createAgencySchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    status: z.nativeEnum(AccountStatus).default(AccountStatus.PENDING)
});
const createUserSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    agencyId: z.string().optional(),
    status: z.nativeEnum(AccountStatus).default(AccountStatus.PENDING)
});
const setStatusSchema = z.object({
    status: z.nativeEnum(AccountStatus)
});
export const adminRouter = Router();
adminRouter.use(authRequired, requireRoles(Role.ADMIN));
adminRouter.post('/agencies', async (req, res) => {
    const parsed = createAgencySchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
        return;
    }
    const { email, name, password, status } = parsed.data;
    const exists = await prisma.account.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) {
        res.status(409).json({ message: 'Email already in use' });
        return;
    }
    const account = await prisma.account.create({
        data: {
            name,
            email: email.toLowerCase(),
            password: await hashPassword(password),
            role: Role.AGENCY,
            status,
            createdById: req.auth.sub
        }
    });
    res.status(201).json({ message: 'Agency created', agency: publicAccount(account) });
});
adminRouter.post('/users', async (req, res) => {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
        return;
    }
    const { email, name, password, agencyId, status } = parsed.data;
    const exists = await prisma.account.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) {
        res.status(409).json({ message: 'Email already in use' });
        return;
    }
    if (agencyId) {
        const agency = await prisma.account.findUnique({ where: { id: agencyId } });
        if (!agency || agency.role !== Role.AGENCY) {
            res.status(400).json({ message: 'Invalid agencyId' });
            return;
        }
    }
    const account = await prisma.account.create({
        data: {
            name,
            email: email.toLowerCase(),
            password: await hashPassword(password),
            role: Role.USER,
            agencyId,
            status,
            createdById: req.auth.sub
        }
    });
    res.status(201).json({ message: 'User created', user: publicAccount(account) });
});
adminRouter.patch('/accounts/:id/status', async (req, res) => {
    const parsed = setStatusSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
        return;
    }
    const { id } = req.params;
    const { status } = parsed.data;
    const account = await prisma.account.findUnique({ where: { id } });
    if (!account) {
        res.status(404).json({ message: 'Account not found' });
        return;
    }
    if (account.id === req.auth.sub) {
        res.status(400).json({ message: 'You cannot change your own status' });
        return;
    }
    const updated = await prisma.account.update({ where: { id }, data: { status } });
    res.json({ message: 'Status updated', account: publicAccount(updated) });
});
adminRouter.get('/accounts', async (req, res) => {
    const querySchema = z.object({
        role: z.nativeEnum(Role).optional(),
        status: z.nativeEnum(AccountStatus).optional()
    });
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({ message: 'Invalid query', errors: parsed.error.flatten() });
        return;
    }
    const accounts = await prisma.account.findMany({
        where: {
            role: parsed.data.role,
            status: parsed.data.status
        },
        orderBy: { createdAt: 'desc' }
    });
    res.json({ accounts: accounts.map(publicAccount) });
});
