import { AccountStatus, Role } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/password.js';
import { publicAccount } from '../lib/account.js';
import { authRequired, requireRoles } from '../middleware/auth.js';
const createAgencyUserSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    status: z.nativeEnum(AccountStatus).default(AccountStatus.PENDING)
});
export const agencyRouter = Router();
agencyRouter.use(authRequired, requireRoles(Role.AGENCY));
agencyRouter.post('/users', async (req, res) => {
    const parsed = createAgencyUserSchema.safeParse(req.body);
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
    const agency = await prisma.account.findUnique({ where: { id: req.auth.sub } });
    if (!agency || agency.role !== Role.AGENCY) {
        res.status(403).json({ message: 'Agency account required' });
        return;
    }
    const account = await prisma.account.create({
        data: {
            name,
            email: email.toLowerCase(),
            password: await hashPassword(password),
            role: Role.USER,
            status,
            agencyId: agency.id,
            createdById: agency.id
        }
    });
    res.status(201).json({ message: 'User created', user: publicAccount(account) });
});
agencyRouter.get('/users', async (req, res) => {
    const users = await prisma.account.findMany({
        where: {
            agencyId: req.auth.sub,
            role: Role.USER
        },
        orderBy: { createdAt: 'desc' }
    });
    res.json({ users: users.map(publicAccount) });
});
