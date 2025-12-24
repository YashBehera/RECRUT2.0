import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:4000';

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Login failed');
      return;
    }
    login(data.token, data.user);
    if (data.user.role === 'INTERVIEWER') {
      nav('/interviewer/dashboard');
    } else {
      nav('/candidate/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
      <form
        className="w-full max-w-sm border border-slate-800 rounded-lg p-6 bg-slate-900 space-y-3"
        onSubmit={handleSubmit}
      >
        <h1 className="text-lg font-semibold">Login</h1>
        <input
          className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-sm"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <input
          type="password"
          className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-sm"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
        {error && <div className="text-xs text-red-400">{error}</div>}
        <button className="w-full py-2 rounded bg-emerald-600 text-sm font-medium">
          Login
        </button>
      </form>
    </div>
  );
}
