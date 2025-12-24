import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ChevronDown,
  Briefcase,
  User,
  Calendar,
  Plus,
  Clock,
  ChevronRight,
  Search,
  Save,
  Menu,
  X,
  Loader2,
  Check,
  Sparkles,
  Trash2
} from 'lucide-react';
import { cn } from '../lib/utils'; // Utility function for conditional classes

type CodingMode = 'leetcode' | 'ai';

type TestCase = {
  input: string;
  output: string;
};

type Question = {
  id: string;
  text: string;
  type: 'text' | 'audio' | 'code' | 'mcq';
  durationSec: number;

  // === CODE SPECIFIC ===
  codingMode?: CodingMode;

  // LeetCode style
  description?: string;
  language?: string;
  options?: string[];
  testCases?: TestCase[];
  hiddenTestCases?: TestCase[];

  // AI style
  aiConfig?: {
    difficulty: 'easy' | 'medium' | 'hard';
    dataStructure: string;
    algorithm: string;
    promptHint: string;
  };
};


type ProctorConfig = {
  heartbeatMs: number;
  frameIntervalMs: number;
  focusLossThreshold: number;
};

type Template = {
  id: string;
  name: string;
  role: string;
  level: string;
  description?: string;
  config: {
    questions: Question[];
    proctor: ProctorConfig;
  };
};

type Interview = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateId: string;
  status: string;
  scheduledAt?: string;
  template?: Template;
  customConfig?: any;
};

type CandidateUser = {
  id: string;
  name: string;
  email: string;
  candidateId?: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// --- Loading Component ---
const LoadingSpinner = ({ size = 'default', className }: {
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) => {
  const sizeClasses = {
    sm: 'size-4',
    default: 'size-6',
    lg: 'size-8'
  };

  return (
    <div className={cn("flex items-center justify-center py-8 sm:py-12", className)}>
      <Loader2 className={cn("animate-spin text-blue-500", sizeClasses[size])} />
    </div>
  );
};

// --- Enhanced Toast Notification ---
const Toast = ({
  message,
  type,
  onClose
}: {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: {
      bg: 'bg-emerald-50/90',
      border: 'border-emerald-200/50',
      text: 'text-emerald-800',
      icon: 'text-emerald-500'
    },
    error: {
      bg: 'bg-red-50/90',
      border: 'border-red-200/50',
      text: 'text-red-800',
      icon: 'text-red-500'
    },
    info: {
      bg: 'bg-blue-50/90',
      border: 'border-blue-200/50',
      text: 'text-blue-800',
      icon: 'text-blue-500'
    }
  }[type];

  const IconComponent = type === 'success' ? Check : type === 'error' ? X : Sparkles;

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm",
      "backdrop-blur-xl border rounded-2xl p-4 shadow-2xl",
      "animate-in slide-in-from-right-full duration-300",
      config.bg,
      config.border,
      config.text
    )}>
      <div className="flex items-start gap-3">
        <IconComponent className={cn("mt-0.5 size-5 shrink-0", config.icon)} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-5 wrap-break-words">{message}</p>
        </div>
        <button
          onClick={onClose}
          className={cn(
            "shrink-0 p-0.5 rounded-lg transition-opacity hover:opacity-70 hover:bg-black/5",
            config.icon
          )}
          aria-label="Close notification"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
};

// --- Status Badge Component ---
const StatusBadge = ({ status }: { status: string }) => {
  const variants = {
    scheduled: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    default: "bg-gray-50 text-gray-700 border-gray-200"
  };

  const dotVariants = {
    scheduled: "bg-blue-500",
    completed: "bg-emerald-500",
    cancelled: "bg-red-500",
    default: "bg-gray-500"
  };

  const variant = variants[status as keyof typeof variants] || variants.default;
  const dotVariant = dotVariants[status as keyof typeof dotVariants] || dotVariants.default;

  return (
    <span className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border",
      variant
    )}>
      <div className={cn("size-2 rounded-full shrink-0", dotVariant)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export function AdminDashboardPage() {
  const { user, token, logout } = useAuth();
  const [tab, setTab] = useState<'templates' | 'interviews'>('templates');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [loading, setLoading] = useState({
    templates: false,
    interviews: false,
    submit: false
  });

  // --- Data State ---
  const [templates, setTemplates] = useState<Template[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);

  // --- Template Form State ---
  const [tplForm, setTplForm] = useState({
    name: '',
    role: '',
    level: '',
    description: '',
  });

  // Questions Builder State
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', type: 'text', text: 'Tell me about yourself.', durationSec: 120 }
  ]);

  // Proctor Config State
  const [proctorConfig, setProctorConfig] = useState<ProctorConfig>({
    heartbeatMs: 5000,
    frameIntervalMs: 5000,
    focusLossThreshold: 3
  });

  // --- Schedule Form State ---
  const [scheduleForm, setScheduleForm] = useState({
    candidateName: '',
    candidateEmail: '',
    candidateId: '',
    templateId: '',
    scheduledAt: '',
  });

  // --- Search State ---
  const [candidateQuery, setCandidateQuery] = useState('');
  const [candidateResults, setCandidateResults] = useState<CandidateUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateUser | null>(null);

  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  // --- Effects ---
  useEffect(() => {
    if (token) {
      loadTemplates();
      loadInterviews();
    }
  }, [token]);

  // Close mobile menu on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Data Loaders ---
  const loadTemplates = useCallback(async () => {
    if (!token) return;

    setLoading(prev => ({ ...prev, templates: true }));
    try {
      const res = await fetch(`${API_BASE}/api/admin/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(Array.isArray(data) ? data : []);
      } else {
        setToast({ message: 'Failed to load templates', type: 'error' });
      }
    } catch (err) {
      console.error('Error loading templates:', err);
      setToast({ message: 'Network error loading templates', type: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, templates: false }));
    }
  }, [token]);

  const loadInterviews = useCallback(async () => {
    if (!token) return;

    setLoading(prev => ({ ...prev, interviews: true }));
    try {
      const res = await fetch(`${API_BASE}/api/admin/interviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInterviews(Array.isArray(data) ? data : []);
      } else {
        setToast({ message: 'Failed to load interviews', type: 'error' });
      }
    } catch (err) {
      console.error('Error loading interviews:', err);
      setToast({ message: 'Network error loading interviews', type: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, interviews: false }));
    }
  }, [token]);

  const searchCandidates = useCallback(async (query: string) => {
    if (!query.trim() || !token) {
      setCandidateResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/candidates?query=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCandidateResults(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Search error:', err);
      setToast({ message: 'Search failed', type: 'error' });
    } finally {
      setSearchLoading(false);
    }
  }, [token]);

  // --- Handlers ---
  const addQuestion = () => {
    const newId = crypto.randomUUID();
    setQuestions(prev => [...prev, {
      id: newId,
      type: 'text',
      text: '',
      durationSec: 60
    }]);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length === 1) {
      setToast({ message: 'At least one question is required', type: 'error' });
      return;
    }
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx: number, field: keyof Question, val: any) => {
    setQuestions(prev => prev.map((q, i) =>
      i === idx ? { ...q, [field]: val } : q
    ));
  };

  const updateProctor = (field: keyof ProctorConfig, val: number) => {
    if (val < 0) return;
    setProctorConfig(prev => ({ ...prev, [field]: val }));
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const hasEmptyQuestion = questions.some(q => !q.text.trim());
    if (hasEmptyQuestion) {
      setToast({ message: 'All questions must have text', type: 'error' });
      return;
    }

    setLoading(prev => ({ ...prev, submit: true }));

    const finalConfig = {
      questions: questions.map(q => ({
        ...q,
        text: q.text.trim(),
      })),
      proctor: proctorConfig
    };

    try {
      const res = await fetch(`${API_BASE}/api/admin/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...tplForm,
          name: tplForm.name.trim(),
          role: tplForm.role.trim(),
          description: tplForm.description.trim(),
          config: finalConfig
        }),
      });

      if (res.ok) {
        setToast({ message: 'Template created successfully!', type: 'success' });
        setTplForm({ name: '', role: '', level: '', description: '' });
        setQuestions([{ id: '1', type: 'text', text: 'Tell me about yourself.', durationSec: 120 }]);
        setProctorConfig({ heartbeatMs: 5000, frameIntervalMs: 5000, focusLossThreshold: 3 });
        loadTemplates();
      } else {
        const errorData = await res.json().catch(() => ({}));
        setToast({ message: errorData.message || 'Failed to create template', type: 'error' });
      }
    } catch (err) {
      console.error('Template creation error:', err);
      setToast({ message: 'Network error', type: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }

    try {
      questions.forEach(q => {
        if (q.type === 'code' && q.codingMode === 'leetcode') {
          JSON.stringify(q.testCases ?? []);
          JSON.stringify(q.hiddenTestCases ?? []);
        }
      });
    } catch {
      setToast({
        message: "Invalid JSON in test cases. Please fix before saving.",
        type: "error"
      });
      setLoading(prev => ({ ...prev, submit: false }));
      return;
    }
    
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(prev => ({ ...prev, submit: true }));

    try {
      const res = await fetch(`${API_BASE}/api/admin/interviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...scheduleForm,
          candidateName: scheduleForm.candidateName.trim(),
          candidateEmail: scheduleForm.candidateEmail.trim(),
        }),
      });

      if (res.ok) {
        setToast({ message: 'Interview scheduled successfully!', type: 'success' });
        setScheduleForm({ candidateName: '', candidateEmail: '', candidateId: '', templateId: '', scheduledAt: '' });
        setSelectedCandidate(null);
        setCandidateQuery('');
        setCandidateResults([]);
        loadInterviews();
      } else {
        const errorData = await res.json().catch(() => ({}));
        setToast({ message: errorData.message || 'Failed to schedule interview', type: 'error' });
      }
    } catch (err) {
      console.error('Interview scheduling error:', err);
      setToast({ message: 'Network error', type: 'error' });
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  // Memoized values
  const upcomingInterviews = useMemo(() =>
    interviews.filter(i => i.status === 'scheduled').length,
    [interviews]
  );

  const totalTemplates = useMemo(() => templates.length, [templates]);

  const tabConfig = useMemo(() => [
    { key: 'templates', icon: Briefcase, label: 'Templates' },
    { key: 'interviews', icon: Calendar, label: 'Interviews' }
  ], []);

  // Handle unauthorized access
  if (!user || user.role !== 'INTERVIEWER') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-lg sm:p-8">
          <div className="mb-6 inline-flex size-16 items-center justify-center rounded-full bg-red-50">
            <X className="size-8 text-red-500" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900 sm:text-2xl">Access Denied</h2>
          <p className="text-sm text-gray-600 sm:text-base">You don't have permission to view this page.</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 w-screen">
      {/* Apple-inspired Navbar */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-2xl">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
            {/* Logo & User Info */}
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-100 lg:hidden"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold text-gray-900 sm:text-xl">
                  Recrut Admin
                </h1>
                <div className="hidden truncate text-xs text-gray-500 sm:block">
                  {user.name} • {user.email}
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden shrink-0 items-center gap-4 lg:flex xl:gap-6">
              {/* Stats Pills */}
              <div className="flex items-center gap-3 rounded-full bg-gray-100 px-3 py-2 xl:gap-4 xl:px-4">
                <div className="flex items-center gap-2">
                  <div className="size-2 shrink-0 rounded-full bg-emerald-500" />
                  <span className="whitespace-nowrap text-xs font-medium text-gray-700">
                    {totalTemplates} Template{totalTemplates !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="h-4 w-px shrink-0 bg-gray-300" />
                <div className="flex items-center gap-2">
                  <div className="size-2 shrink-0 rounded-full bg-blue-500" />
                  <span className="whitespace-nowrap text-xs font-medium text-gray-700">
                    {upcomingInterviews} Scheduled
                  </span>
                </div>
              </div>

              {/* Tab Switcher */}
              <div className="flex rounded-full bg-gray-100 p-1">
                {tabConfig.map((t) => {
                  const IconComponent = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key as any)}
                      className={cn(
                        "flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-all xl:px-4",
                        tab === t.key
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      <IconComponent className="size-4" />
                      <span className="hidden xl:inline">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={logout}
                className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50 hover:text-red-700 xl:px-4"
              >
                Sign Out
              </button>
            </div>

            {/* Mobile Sign Out */}
            <div className="shrink-0 lg:hidden">
              <button
                onClick={logout}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-50 hover:text-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white/95 backdrop-blur-xl lg:hidden">
            <div className="mx-auto max-w-7xl space-y-4 px-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                {tabConfig.map((t) => {
                  const IconComponent = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => {
                        setTab(t.key as any);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                        tab === t.key
                          ? "border border-blue-200 bg-blue-50 text-blue-600"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      <IconComponent className="size-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-around rounded-xl bg-gray-100 py-4">
                <div className="text-center">
                  <div className="text-xl font-semibold text-gray-900">{totalTemplates}</div>
                  <div className="text-xs font-medium text-gray-500">Templates</div>
                </div>
                <div className="w-px bg-gray-300" />
                <div className="text-center">
                  <div className="text-xl font-semibold text-gray-900">{upcomingInterviews}</div>
                  <div className="text-xs font-medium text-gray-500">Scheduled</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">
          {/* --- TEMPLATES TAB --- */}
          {tab === 'templates' && (
            <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
              {/* Template Creator */}
              <div className="space-y-6 lg:col-span-7 xl:col-span-8">
                <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
                  <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-8 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 sm:size-12">
                        <Plus className="size-5 text-blue-600 sm:size-6" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">Create Template</h2>
                        <p className="hidden text-sm text-gray-600 sm:block">Design your interview structure</p>
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5">
                      <span className="text-xs font-semibold text-gray-700">
                        {questions.length} Question{questions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleCreateTemplate} className="space-y-6 sm:space-y-8">
                    {/* Basic Template Info */}
                    <div className="space-y-4 sm:space-y-6">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-900">Template Name</label>
                          <input
                            required
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            placeholder="Senior Frontend Developer"
                            value={tplForm.name}
                            onChange={e => setTplForm({ ...tplForm, name: e.target.value })}
                            maxLength={100}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-900">Experience Level</label>
                          <select
                            required
                            className="w-full cursor-pointer appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            value={tplForm.level}
                            onChange={e => setTplForm({ ...tplForm, level: e.target.value })}
                          >
                            <option value="">Select Level...</option>
                            <option value="junior">Junior (0-2 years)</option>
                            <option value="mid">Mid-Level (2-5 years)</option>
                            <option value="senior">Senior (5+ years)</option>
                            <option value="lead">Lead/Principal</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900">Target Role</label>
                        <input
                          required
                          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          placeholder="React Developer, DevOps Engineer"
                          value={tplForm.role}
                          onChange={e => setTplForm({ ...tplForm, role: e.target.value })}
                          maxLength={100}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900">Description</label>
                        <textarea
                          className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          rows={3}
                          placeholder="Brief description of the interview structure and goals..."
                          value={tplForm.description}
                          onChange={e => setTplForm({ ...tplForm, description: e.target.value })}
                          maxLength={500}
                        />
                      </div>
                    </div>

                    {/* Proctor Configuration */}
                    <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 sm:p-6">
                      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-indigo-900">
                        <Clock className="shrink-0 text-indigo-600" />
                        Proctor Configuration
                      </h3>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-indigo-700">Heartbeat Interval</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1000"
                              max="60000"
                              step="1000"
                              className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 pr-12 text-sm text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                              value={proctorConfig.heartbeatMs}
                              onChange={e => updateProctor('heartbeatMs', parseInt(e.target.value) || 5000)}
                            />
                            <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-medium text-gray-500">ms</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-indigo-700">Frame Capture Rate</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1000"
                              max="60000"
                              step="1000"
                              className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 pr-12 text-sm text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                              value={proctorConfig.frameIntervalMs}
                              onChange={e => updateProctor('frameIntervalMs', parseInt(e.target.value) || 5000)}
                            />
                            <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-medium text-gray-500">ms</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-indigo-700">Focus Loss Limit</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              max="10"
                              className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 pr-16 text-sm text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                              value={proctorConfig.focusLossThreshold}
                              onChange={e => updateProctor('focusLossThreshold', parseInt(e.target.value) || 3)}
                            />
                            <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-medium text-gray-500">strikes</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Questions Builder */}
                    <div className="space-y-4">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <h3 className="text-lg font-semibold text-gray-900">Interview Questions</h3>
                        <button
                          type="button"
                          onClick={addQuestion}
                          className="flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-black shadow-sm transition-all hover:bg-blue-700 hover:shadow-md active:scale-95 sm:self-auto"
                        >
                          <Plus className="size-4" />
                          Add Question
                        </button>
                      </div>

                      <div className="max-h-[500px] space-y-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 scrollbar-thumb-rounded-full hover:scrollbar-thumb-gray-400 p-5">
                        {questions.map((q, idx) => (
                          <div
                            key={q.id}
                            className="group relative rounded-2xl border border-gray-200 bg-gray-50 p-4 transition-all hover:bg-gray-100 sm:p-6"
                          >
                            {/* Question Number */}
                            <div className="absolute -left-2 top-4 flex size-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white shadow-lg sm:-left-3 sm:top-6 sm:size-8 sm:text-sm">
                              {idx + 1}
                            </div>

                            {/* Delete Button */}
                            {questions.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeQuestion(idx)}
                                className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 sm:right-4 sm:top-4 sm:p-2"
                                aria-label={`Delete question ${idx + 1}`}
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}

                            <div className="ml-3 space-y-4 pr-8 sm:ml-4 sm:pr-10">
                              {/* Question Type and Duration */}
                              <div className="flex flex-col gap-3 sm:flex-row">
                                <select
                                  className="min-w-0 flex-1 cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                  value={q.type}
                                  onChange={e => updateQuestion(idx, 'type', e.target.value)}
                                >
                                  <option value="text">✏️ Text Response</option>
                                  <option value="audio">🎤 Voice Response</option>
                                  <option value="mcq">☑️ Multiple Choice</option>
                                  <option value="code">💻 Code Challenge</option>
                                </select>

                                <div className="flex w-full items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 sm:w-auto">
                                  <Clock className="shrink-0 text-gray-500" />
                                  <input
                                    type="number"
                                    min="10"
                                    max="600"
                                    className="w-16 bg-transparent text-sm text-gray-900 outline-none"
                                    value={q.durationSec}
                                    onChange={e => updateQuestion(idx, 'durationSec', parseInt(e.target.value) || 60)}
                                  />
                                  <span className="whitespace-nowrap text-xs font-medium text-gray-500">sec</span>
                                </div>
                              </div>

                              {/* Question Text */}
                              <textarea
                                required
                                className="w-full resize-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                rows={3}
                                placeholder="Enter your question here..."
                                value={q.text}
                                onChange={e => updateQuestion(idx, 'text', e.target.value)}
                                maxLength={1000}
                              />

                              {q.type === 'code' && (
                                <div className="border-l-2 border-purple-500 pl-4">
                                  {/* Coding Mode */}
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                      Coding Question Type
                                    </label>
                                    <select
                                      className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm"
                                      value={q.codingMode || 'leetcode'}
                                      onChange={e => {
                                        const mode = e.target.value as CodingMode;
                                        updateQuestion(idx, 'codingMode', mode);

                                        if (mode === 'ai') {
                                          updateQuestion(idx, 'aiConfig', {
                                            difficulty: 'medium',
                                            dataStructure: '',
                                            algorithm: '',
                                            promptHint: ''
                                          });
                                        }
                                      }}
                                    >
                                      <option value="leetcode">🧩 LeetCode Style</option>
                                      <option value="ai">🤖 AI Generated</option>
                                    </select>
                                    {q.codingMode === 'leetcode' && (
                                      <>
                                        {/* Problem Description */}
                                        <textarea
                                          className="w-full rounded-xl border px-4 py-3 text-sm"
                                          placeholder="Problem description (shown to candidate)"
                                          value={q.description || ''}
                                          onChange={e => updateQuestion(idx, 'description', e.target.value)}
                                        />

                                        {/* Language */}
                                        <select
                                          className="w-full rounded-xl border px-4 py-2.5 text-sm"
                                          value={q.language || 'javascript'}
                                          onChange={e => updateQuestion(idx, 'language', e.target.value)}
                                        >
                                          <option value="javascript">JavaScript</option>
                                          <option value="typescript">TypeScript</option>
                                          <option value="python">Python</option>
                                          <option value="java">Java</option>
                                          <option value="cpp">C++</option>
                                        </select>

                                        {/* Public Test Cases */}
                                        <textarea
                                          className="w-full rounded-xl border px-4 py-3 text-sm font-mono"
                                          placeholder={`Public Test Cases (JSON)\n[{ "input": "[1,2]", "output": "3" }]`}
                                          value={JSON.stringify(q.testCases || [], null, 2)}
                                          onChange={e => {
                                            try {
                                              const parsed = JSON.parse(e.target.value);
                                              updateQuestion(idx, 'testCases', parsed);
                                            } catch {
                                              // silently ignore while typing
                                            }
                                          }}
                                        />

                                        {/* Hidden Test Cases */}
                                        <textarea
                                          className="w-full rounded-xl border px-4 py-3 text-sm font-mono"
                                          placeholder={`Hidden Test Cases (JSON)\n[{ "input": "[5,7]", "output": "12" }]`}
                                          value={JSON.stringify(q.hiddenTestCases || [], null, 2)}
                                          onChange={e => {
                                            try {
                                              const parsed = JSON.parse(e.target.value);
                                              updateQuestion(idx, 'hiddenTestCases', parsed);
                                            } catch {
                                              // silently ignore while typing
                                            }
                                          }}

                                        />
                                      </>
                                    )}
                                    {q.codingMode === 'ai' && (
                                      <>
                                        <select
                                          className="w-full rounded-xl border px-4 py-2.5 text-sm"
                                          value={q.aiConfig?.difficulty || 'medium'}
                                          onChange={e =>
                                            updateQuestion(idx, 'aiConfig', {
                                              ...q.aiConfig,
                                              difficulty: e.target.value
                                            })
                                          }
                                        >
                                          <option value="easy">Easy</option>
                                          <option value="medium">Medium</option>
                                          <option value="hard">Hard</option>
                                        </select>

                                        <input
                                          className="w-full rounded-xl border px-4 py-2.5 text-sm"
                                          placeholder="Data Structure (e.g. Array, Tree, Graph)"
                                          value={q.aiConfig?.dataStructure || ''}
                                          onChange={e =>
                                            updateQuestion(idx, 'aiConfig', {
                                              ...q.aiConfig,
                                              dataStructure: e.target.value
                                            })
                                          }
                                        />

                                        <input
                                          className="w-full rounded-xl border px-4 py-2.5 text-sm"
                                          placeholder="Algorithm (e.g. BFS, DP, Binary Search)"
                                          value={q.aiConfig?.algorithm || ''}
                                          onChange={e =>
                                            updateQuestion(idx, 'aiConfig', {
                                              ...q.aiConfig,
                                              algorithm: e.target.value
                                            })
                                          }
                                        />

                                        <textarea
                                          className="w-full rounded-xl border px-4 py-3 text-sm"
                                          placeholder="Prompt guidance for AI (optional)"
                                          value={q.aiConfig?.promptHint || ''}
                                          onChange={e =>
                                            updateQuestion(idx, 'aiConfig', {
                                              ...q.aiConfig,
                                              promptHint: e.target.value
                                            })
                                          }
                                        />

                                        {/* Regenerate Button */}
                                        <button
                                          type="button"
                                          disabled={aiLoading[q.id]}
                                          className={cn(
                                            "mt-2 rounded-xl px-4 py-2 text-sm font-semibold text-white",
                                            aiLoading[q.id]
                                              ? "bg-purple-400 cursor-not-allowed"
                                              : "bg-purple-600 hover:bg-purple-700"
                                          )}
                                          onClick={async () => {
                                            try {
                                              setAiLoading(prev => ({ ...prev, [q.id]: true }));
                                              setToast({ message: "Generating question with AI...", type: "info" });

                                              const res = await fetch(`${API_BASE}/api/admin/ai-generate-question`, {
                                                method: 'POST',
                                                headers: {
                                                  'Content-Type': 'application/json',
                                                  Authorization: `Bearer ${token}`
                                                },
                                                body: JSON.stringify(q.aiConfig)
                                              });

                                              if (!res.ok) throw new Error("AI generation failed");

                                              const data = await res.json();

                                              updateQuestion(idx, 'text', data.title);
                                              updateQuestion(idx, 'description', data.description);
                                              updateQuestion(idx, 'testCases', data.testCases);
                                              updateQuestion(idx, 'hiddenTestCases', data.hiddenTestCases);

                                              setToast({ message: "AI question generated successfully!", type: "success" });
                                            } catch (err) {
                                              console.error(err);
                                              setToast({ message: "Failed to generate AI question", type: "error" });
                                            } finally {
                                              setAiLoading(prev => ({ ...prev, [q.id]: false }));
                                            }
                                          }}
                                        >
                                          {aiLoading[q.id] ? "⏳ Generating..." : "🔄 Regenerate with AI"}
                                        </button>

                                      </>
                                    )}

                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading.submit || !tplForm.name.trim() || !tplForm.role.trim() || !tplForm.level}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 py-4 font-semibold text-black shadow-lg transition-all hover:scale-[1.02] hover:bg-blue-700 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {loading.submit ? (
                        <>
                          <Loader2 className="size-5 animate-spin" />
                          Creating Template...
                        </>
                      ) : (
                        <>
                          <Save className="size-5" />
                          Save Template Configuration
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Template Library */}
              <div className="space-y-4 lg:col-span-5 xl:col-span-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-lg font-semibold text-gray-900">Template Library</h2>
                  <div className="rounded-full bg-gray-100 px-3 py-1.5">
                    <span className="text-xs font-semibold text-gray-700">{templates.length} Total</span>
                  </div>
                </div>

                {loading.templates ? (
                  <LoadingSpinner />
                ) : (
                  <div className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 scrollbar-thumb-rounded-full hover:scrollbar-thumb-gray-400">
                    {templates.length === 0 ? (
                      <div className="rounded-2xl border border-gray-200 bg-white py-8 text-center sm:py-12">
                        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-gray-100">
                          <Briefcase className="size-6 text-gray-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">No templates created yet</p>
                        <p className="mt-1 text-xs text-gray-500">Create your first template to get started</p>
                      </div>
                    ) : (
                      templates.map((t) => (
                        <div
                          key={t.id}
                          className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-md sm:p-6"
                        >
                          <div className="mb-4 flex items-start justify-between">
                            <div className="min-w-0 flex-1 pr-3">
                              <h3 className="mb-2 truncate font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
                                {t.name}
                              </h3>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                                  <Briefcase className="size-3 shrink-0" />
                                  <span className="truncate">{t.role}</span>
                                </span>
                                <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                                  {t.level?.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <button className="shrink-0 rounded-lg p-2 opacity-0 transition-opacity hover:bg-gray-50 group-hover:opacity-100">
                              <ChevronRight className="size-4 text-gray-400" />
                            </button>
                          </div>

                          {t.description && (
                            <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-600">{t.description}</p>
                          )}

                          <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-500">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <span className="flex items-center gap-1.5">
                                <div className="size-2 shrink-0 rounded-full bg-emerald-500" />
                                <span className="whitespace-nowrap">{t.config?.questions?.length || 0} Questions</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <div className="size-2 shrink-0 rounded-full bg-blue-500" />
                                <span className="whitespace-nowrap">
                                  {t.config?.proctor?.heartbeatMs ? `${t.config.proctor.heartbeatMs / 1000}s` : 'N/A'}
                                </span>
                              </span>
                            </div>
                            <time className="whitespace-nowrap font-medium">
                              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </time>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --- INTERVIEWS TAB --- */}
          {tab === 'interviews' && (
            <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
              {/* Schedule Form */}
              <div className="lg:col-span-5 xl:col-span-4">
                <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
                  <div className="mb-6 flex items-center gap-3 sm:mb-8 sm:gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 sm:size-12">
                      <Calendar className="size-5 text-blue-600 sm:size-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">Schedule Interview</h2>
                      <p className="hidden text-sm text-gray-600 sm:block">Set up a new interview session</p>
                    </div>
                  </div>

                  {/* Candidate Search */}
                  <div className="relative mb-6">
                    <label className="mb-3 block text-sm font-semibold text-gray-900">
                      Find Candidate
                    </label>
                    <div className="relative">
                      <input
                        className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-12 pr-4 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:py-4"
                        placeholder="Search by name, email or ID..."
                        value={candidateQuery}
                        onChange={e => {
                          setCandidateQuery(e.target.value);
                          if (e.target.value.length > 2) searchCandidates(e.target.value);
                          else setCandidateResults([]);
                        }}
                      />
                      <div className="pointer-events-none absolute left-4 top-3 text-gray-400 sm:top-4">
                        {searchLoading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                      </div>
                    </div>

                    {/* Search Results Dropdown */}
                    {candidateResults.length > 0 && (
                      <div className="absolute z-20 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 scrollbar-thumb-rounded-full hover:scrollbar-thumb-gray-400">
                        {candidateResults.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedCandidate(c);
                              setScheduleForm({
                                ...scheduleForm,
                                candidateName: c.name,
                                candidateEmail: c.email,
                                candidateId: c.candidateId || ''
                              });
                              setCandidateResults([]);
                              setCandidateQuery(c.name);
                            }}
                            className="group w-full border-b border-gray-100 p-4 text-left transition-colors last:border-0 hover:bg-gray-50"
                          >
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-gray-900 transition-colors group-hover:text-blue-600">
                                  {c.name}
                                </div>
                                <div className="mt-1 truncate text-xs text-gray-500">{c.email}</div>
                                {c.candidateId && (
                                  <div className="mt-1 text-xs text-gray-400">ID: {c.candidateId}</div>
                                )}
                              </div>
                              <User className="ml-3 size-5 shrink-0 text-gray-300 transition-colors group-hover:text-blue-400" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Candidate Card */}
                  {selectedCandidate && (
                    <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                            <User className="size-5 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-blue-900">{selectedCandidate.name}</div>
                            <div className="truncate text-xs text-blue-700">{selectedCandidate.email}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedCandidate(null);
                            setCandidateQuery('');
                            setScheduleForm({
                              ...scheduleForm,
                              candidateName: '',
                              candidateEmail: '',
                              candidateId: ''
                            });
                          }}
                          className="shrink-0 rounded-lg p-1 text-blue-400 transition-colors hover:bg-blue-100 hover:text-blue-600"
                          aria-label="Clear selection"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleScheduleInterview} className="space-y-4 sm:space-y-6">
                    {/* Manual Entry Fields */}
                    {!selectedCandidate && (
                      <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-900">Name</label>
                            <input
                              required
                              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                              placeholder="John Doe"
                              value={scheduleForm.candidateName}
                              onChange={e => setScheduleForm({ ...scheduleForm, candidateName: e.target.value })}
                              maxLength={100}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-900">Candidate ID</label>
                            <input
                              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                              placeholder="Optional"
                              value={scheduleForm.candidateId}
                              onChange={e => setScheduleForm({ ...scheduleForm, candidateId: e.target.value })}
                              maxLength={50}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-900">Email Address</label>
                          <input
                            required
                            type="email"
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            placeholder="john.doe@example.com"
                            value={scheduleForm.candidateEmail}
                            onChange={e => setScheduleForm({ ...scheduleForm, candidateEmail: e.target.value })}
                            maxLength={255}
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-900">Interview Template</label>
                      <select
                        required
                        className="w-full cursor-pointer appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        value={scheduleForm.templateId}
                        onChange={e => setScheduleForm({ ...scheduleForm, templateId: e.target.value })}
                      >
                        <option value="">Select a template...</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} • {t.role} • {t.level}
                          </option>
                        ))}
                      </select>
                      {templates.length === 0 && (
                        <p className="mt-1 text-xs text-amber-600">No templates available. Create a template first.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-900">Schedule Date & Time</label>
                      <input
                        required
                        type="datetime-local"
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        value={scheduleForm.scheduledAt}
                        onChange={e => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading.submit || templates.length === 0}
                      className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 py-4 font-semibold text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-blue-700 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {loading.submit ? (
                        <>
                          <Loader2 className="size-5 animate-spin" />
                          Scheduling...
                        </>
                      ) : (
                        <>
                          <Calendar className="size-5" />
                          Schedule Interview
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Interview List */}
              <div className="space-y-4 lg:col-span-7 xl:col-span-8">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-lg font-semibold text-gray-900">Scheduled Interviews</h2>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-gray-100 px-3 py-1.5">
                      <span className="text-xs font-semibold text-gray-700">{interviews.length} Total</span>
                    </div>
                  </div>
                </div>

                {loading.interviews ? (
                  <LoadingSpinner />
                ) : (
                  <div className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 scrollbar-thumb-rounded-full hover:scrollbar-thumb-gray-400">
                    {interviews.length === 0 ? (
                      <div className="rounded-2xl border border-gray-200 bg-white py-8 text-center sm:py-12">
                        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-gray-100">
                          <Calendar className="size-6 text-gray-500" />
                        </div>
                        <p className="text-sm font-medium text-gray-600">No interviews scheduled yet</p>
                        <p className="mt-1 text-xs text-gray-500">Schedule your first interview to get started</p>
                      </div>
                    ) : (
                      interviews.map(iv => (
                        <div
                          key={iv.id}
                          className="group rounded-2xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-md sm:p-6"
                        >
                          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                            <div className="min-w-0 flex-1">
                              <div className="mb-3 flex items-center gap-3 sm:gap-4">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-gray-100 to-gray-200 text-lg font-semibold text-gray-700 sm:size-12">
                                  {iv.candidateName.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="truncate font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
                                    {iv.candidateName}
                                  </h3>
                                  <div className="truncate text-sm text-gray-600">{iv.candidateEmail}</div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <StatusBadge status={iv.status} />

                                <span className="inline-flex items-center gap-2 text-xs text-gray-600 sm:text-sm">
                                  <Calendar className="size-3 shrink-0 sm:size-4" />
                                  <span className="truncate">
                                    {iv.scheduledAt ? new Date(iv.scheduledAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : 'Not scheduled'}
                                  </span>
                                </span>

                                {iv.candidateId && (
                                  <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
                                    ID: {iv.candidateId}
                                  </span>
                                )}
                              </div>
                            </div>

                            <Link
                              to={`/admin/interview/${iv.id}`}
                              className="group/btn inline-flex shrink-0 items-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-200 hover:text-gray-900 lg:self-auto"
                            >
                              Manage
                              <ChevronDown className="size-4 -rotate-90 transition-transform group-hover/btn:translate-x-1" />
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

