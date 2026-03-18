const BASE = (process.env.NEXT_PUBLIC_ACCESS_BACKEND_URL || 'http://localhost:4000').replace(/\/+$/, '');
export type Role = 'ADMIN' | 'AGENCY' | 'USER';
export type AccountStatus = 'PENDING' | 'ACTIVE' | 'BLOCKED';

export type Account = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: AccountStatus;
  agencyId?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
};

async function parse(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

export async function login(data: { email: string; password: string }) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });

  const json = await parse(res);
  if (!res.ok) {
    throw Object.assign(new Error('Login failed'), { status: res.status, data: json });
  }

  return json;
}

export async function logout() {
  const res = await fetch(`${BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  return parse(res);
}

export async function getMe() {
  const res = await fetch(`${BASE}/api/auth/me`, {
    credentials: 'include'
  });

  if (!res.ok) {
    return null;
  }

  return parse(res);
}

export async function createAgencyUser(data: { name: string; email: string; password: string }) {
  const res = await fetch(`${BASE}/api/agency/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });

  const json = await parse(res);
  if (!res.ok) {
    throw Object.assign(new Error('Create agency user failed'), { status: res.status, data: json });
  }

  return json;
}

export async function createAgency(data: { name: string; email: string; password: string }) {
  const res = await fetch(`${BASE}/api/admin/agencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });
  const json = await parse(res);
  if (!res.ok) {
    throw Object.assign(new Error('Create agency failed'), { status: res.status, data: json });
  }
  return json;
}

export async function createAdminUser(data: { name: string; email: string; password: string; agencyId?: string }) {
  const res = await fetch(`${BASE}/api/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });
  const json = await parse(res);
  if (!res.ok) {
    throw Object.assign(new Error('Create user failed'), { status: res.status, data: json });
  }
  return json;
}

export async function listAccounts(filters?: { role?: Role; status?: AccountStatus }) {
  const qs = new URLSearchParams();
  if (filters?.role) qs.set('role', filters.role);
  if (filters?.status) qs.set('status', filters.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';

  const res = await fetch(`${BASE}/api/admin/accounts${suffix}`, {
    credentials: 'include'
  });
  const json = await parse(res);
  if (!res.ok) {
    throw Object.assign(new Error('List accounts failed'), { status: res.status, data: json });
  }
  return json as { accounts: Account[] };
}

export async function setAccountStatus(accountId: string, status: AccountStatus) {
  const res = await fetch(`${BASE}/api/admin/accounts/${accountId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status })
  });
  const json = await parse(res);
  if (!res.ok) {
    throw Object.assign(new Error('Update status failed'), { status: res.status, data: json });
  }
  return json;
}

export async function listAgencyUsers() {
  const res = await fetch(`${BASE}/api/agency/users`, {
    credentials: 'include'
  });
  const json = await parse(res);
  if (!res.ok) {
    throw Object.assign(new Error('List agency users failed'), { status: res.status, data: json });
  }
  return json as { users: Account[] };
}
