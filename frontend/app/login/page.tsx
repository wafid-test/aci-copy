import Link from 'next/link';

export default function Page() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Login</h1>
      <Link href="/admin/login">Admin</Link>
      <br />
      <Link href="/agency/login">Agency</Link>
      <br />
      <Link href="/user/login">User</Link>
    </div>
  );
}