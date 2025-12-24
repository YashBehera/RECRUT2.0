import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Brain, User, Briefcase, Mail, Lock, Loader2, ArrowRight, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'CANDIDATE' as 'CANDIDATE' | 'INTERVIEWER',
    candidateId: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      login(data.token, data.user);
      navigate(data.user.role === 'INTERVIEWER' ? '/interviewer/dashboard' : '/candidate/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-slate-950">
      {/* Left Side */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 items-center justify-center">
        <div className="absolute inset-0 bg-linear-to-br from-emerald-500/10 via-slate-900 to-slate-900" />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-linear-to-t from-slate-950 to-transparent" />
        
        <div className="relative z-10 p-12">
            <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="space-y-6"
            >
                <div className="w-16 h-16 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-5xl font-bold text-white leading-tight">
                    Join the Future of <br/>
                    <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-teal-400">
                        Intelligent Hiring
                    </span>
                </h2>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 text-slate-400">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p>AI-powered candidate analysis</p>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p>Seamless interview management</p>
                    </div>
                </div>
            </motion.div>
        </div>
      </div>

      {/* Right Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-8 my-auto">
            <div className="text-center lg:text-left">
                <h1 className="text-3xl font-bold text-white tracking-tight">Create Account</h1>
                <p className="mt-2 text-slate-400">
                    Already have an account?{' '}
                    <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Role Selection */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setForm({ ...form, role: 'CANDIDATE' })}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                            form.role === 'CANDIDATE'
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                    >
                        <User className="w-6 h-6" />
                        <span className="text-sm font-medium">Candidate</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setForm({ ...form, role: 'INTERVIEWER' })}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                            form.role === 'INTERVIEWER'
                                ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400'
                                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                    >
                        <Briefcase className="w-6 h-6" />
                        <span className="text-sm font-medium">Interviewer</span>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="relative group">
                        <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                            placeholder="Full Name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </div>

                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                            type="email"
                            required
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                            placeholder="Email address"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                    
                    <div className="relative group">
                        <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                            type="password"
                            required
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                            placeholder="Password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                    </div>

                    {form.role === 'CANDIDATE' && (
                        <div className="relative group">
                            <span className="absolute left-4 top-3.5 font-mono text-sm text-slate-500 group-focus-within:text-emerald-400 transition-colors">#</span>
                            <input
                                type="text"
                                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                                placeholder="Registration No (Optional)"
                                value={form.candidateId}
                                onChange={(e) => setForm({ ...form, candidateId: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            Create Account
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
}