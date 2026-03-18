export function publicAccount(account) {
    return {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        status: account.status,
        agencyId: account.agencyId,
        createdById: account.createdById,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
    };
}
