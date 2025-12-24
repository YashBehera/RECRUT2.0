import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:4000';

type CandidateInterview = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidateId: string;
  status: string;
  scheduledAt?: string;
  template?: {
    id: string;
    name: string;
    role: string;
    level: string;
  } | null;
};

export function CandidateDashboardPage() {
  const { user, token, logout } = useAuth();
  const [interviews, setInterviews] = useState<CandidateInterview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/me/interviews`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          console.error('load interviews error', data);
          setLoading(false);
          return;
        }
        setInterviews(data);
      } catch (e) {
        console.error('Error loading interviews', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (!user) return <div>Not logged in</div>;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div>Loading your interviews…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 w-screen">
      <header className="p-4 border-b border-slate-800 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold">Candidate Dashboard</h1>
          <p className="text-xs text-slate-400">
            {user.name} ({user.email})
          </p>
        </div>
        <button
          className="text-xs text-slate-400 underline"
          onClick={logout}
        >
          Logout
        </button>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        {interviews.length === 0 ? (
          <div className="text-slate-400">
            No interviews scheduled for you yet.
          </div>
        ) : (
          <div className="space-y-3">
            {interviews.map((iv) => (
              <div
                key={iv.id}
                className="border border-slate-800 rounded-lg p-3 flex flex-col gap-1"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-semibold">
                      {iv.template ? iv.template.name : 'Interview'}
                    </div>
                    <div className="text-xs text-slate-400">
                      Reg. No: <span className="font-mono">{iv.candidateId}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">
                    {iv.status.toUpperCase()}
                  </span>
                </div>
                {iv.scheduledAt && (
                  <div className="text-xs text-slate-400">
                    Scheduled:{' '}
                    {new Date(iv.scheduledAt).toLocaleString()}
                  </div>
                )}
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-slate-500">
                    Interview ID: {iv.id.slice(0, 8)}
                  </span>
                  {(iv.status === 'scheduled' || iv.status === 'ongoing') && (
                    <Link
                      to={`/interview/${iv.id}`}
                      className="px-3 py-1 rounded bg-emerald-600 text-xs font-medium text-white"
                    >
                      Join
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
