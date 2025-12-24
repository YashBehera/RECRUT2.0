import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
    Save, 
    AlertTriangle, 
    CheckCircle, 
    Play, 
    FileText, 
    Clock, 
    Plus, 
    Trash2,
    X,
    MessageSquare,
    Video,
    Brain
} from 'lucide-react';

// --- Reusing Types ---
type Question = {
  id: string;
  type: 'text' | 'audio' | 'code' | 'mcq';
  text: string;
  durationSec?: number;
  options?: string[];
  language?: string;
};

type AIAnalysis = {
  score: number;
  emotion: string;
  contradiction?: string | null;
  followUpQuestion?: string | null;
};

type MediaRecord = {
  id: string;
  type: 'audio' | 'video' | 'frame';
  path: string;
  transcript: string | null;
  analysisJson: AIAnalysis | null;
  createdAt: string;
};

type Interview = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  suspicionScore: number;
  proctorEvents: { id: string; type: string; payload: any; createdAt: string }[];
  mediaRecords: MediaRecord[];
  customConfig?: { questions?: Question[]; proctor?: any };
  template?: { config: { questions?: Question[]; proctor?: any } };
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

// --- Inline Toast Component ---
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) => (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border backdrop-blur-md animate-in slide-in-from-right ${
        type === 'success' ? 'bg-emerald-900/80 border-emerald-500/30 text-emerald-100' : 'bg-red-900/80 border-red-500/30 text-red-100'
    }`}>
        {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="w-4 h-4" /></button>
    </div>
);

export function AdminInterviewPage() {
  const { id } = useParams<{ id: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchInterview();
  }, [id]);

  const fetchInterview = async () => {
    try {
        const res = await fetch(`${API_BASE}/api/admin/interviews/${id}`, {
             headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setInterview(data);
        const initialQuestions = data.customConfig?.questions || data.template?.config?.questions || [];
        setQuestions(initialQuestions);
    } catch (err) {
        console.error(err);
    }
  };

  const handleSaveConfig = async () => {
    if (!interview) return;
    setSaving(true);
    try {
      const existingProctorConfig = interview.customConfig?.proctor || interview.template?.config?.proctor || {};
      const payload = { customConfig: { questions, proctor: existingProctorConfig } };

      await fetch(`${API_BASE}/api/admin/interviews/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(payload),
      });
      setToast({ msg: 'Configuration saved successfully', type: 'success' });
    } catch (e) {
      setToast({ msg: 'Failed to save configuration', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQuestions = [...questions];
    // @ts-ignore 
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  if (!interview) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  const responses = interview.mediaRecords?.filter(r => ['audio', 'video'].includes(r.type)) || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">Interview Monitor</h1>
                <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${interview.suspicionScore > 5 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    Suspicion: {interview.suspicionScore}
                </span>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {interview.id.slice(0,8)}</span>
              <span className="w-1 h-1 bg-slate-700 rounded-full" />
              <span className="text-white font-medium">{interview.candidateName}</span>
              <span className="w-1 h-1 bg-slate-700 rounded-full" />
              <span>{interview.candidateEmail}</span>
            </div>
          </div>
          <button 
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 shadow-lg shadow-indigo-900/20"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Question Editor */}
          <section className="xl:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-200">Questions Configuration</h2>
              <button 
                onClick={() => setQuestions([...questions, { id: crypto.randomUUID(), type: 'text', text: '', durationSec: 60 }])} 
                className="flex items-center gap-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-indigo-400 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="group p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-4 transition-all hover:border-slate-700 hover:shadow-lg hover:shadow-black/20">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-mono">
                        {idx + 1}
                        </span>
                        <div className="w-px h-full bg-slate-800 group-last:hidden" />
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap gap-3">
                        <select 
                          value={q.type}
                          onChange={(e) => updateQuestion(idx, 'type', e.target.value)}
                          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:border-indigo-500 outline-none"
                        >
                          <option value="text">Short Answer</option>
                          <option value="audio">Voice Recording</option>
                          <option value="mcq">Multiple Choice</option>
                          <option value="code">Code Challenge</option>
                        </select>
                        
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <input 
                            type="number" 
                            value={q.durationSec || 60}
                            onChange={(e) => updateQuestion(idx, 'durationSec', parseInt(e.target.value))}
                            className="w-12 bg-transparent text-sm text-slate-300 outline-none text-right"
                          />
                          <span className="text-xs text-slate-500">s</span>
                        </div>

                        <button onClick={() => setQuestions(questions.filter((_, i) => i !== idx))} className="ml-auto p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <textarea
                        value={q.text}
                        onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
                        placeholder="Type the interview question here..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder-slate-600 focus:border-indigo-500 outline-none resize-none h-24 text-sm leading-relaxed"
                      />

                      {q.type === 'mcq' && (
                        <input 
                          type="text"
                          value={q.options?.join(', ') || ''}
                          onChange={(e) => updateQuestion(idx, 'options', e.target.value.split(',').map(s => s.trim()))}
                          placeholder="Options (comma separated): Apple, Banana, Cherry"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Proctor Logs */}
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-200">Live Proctor Logs</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden h-[600px] flex flex-col">
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {interview.proctorEvents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-600 text-sm">No events detected yet</div>
                ) : (
                    interview.proctorEvents.map((e) => (
                    <div key={e.id} className="group p-3 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700">
                        <div className="flex justify-between items-center mb-1.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            e.type.includes('VIOLATION') || e.type.includes('forbidden') 
                            ? 'bg-red-500/10 text-red-400' 
                            : 'bg-blue-500/10 text-blue-400'
                        }`}>
                            {e.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(e.createdAt).toLocaleTimeString()}
                        </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono break-all line-clamp-2 group-hover:line-clamp-none">
                            {JSON.stringify(e.payload)}
                        </p>
                    </div>
                    ))
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Responses & AI Section */}
        <section className="pt-8 border-t border-slate-800 space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Brain className="w-6 h-6 text-indigo-500" />
                AI Analysis & Responses
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {responses.length === 0 ? (
                    <div className="col-span-full py-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500">
                        Candidate hasn't submitted any responses yet.
                    </div>
                ) : (
                    responses.map((record) => (
                        <div key={record.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-colors">
                            {/* Header */}
                            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    {record.type === 'audio' ? <MessageSquare className="w-4 h-4 text-indigo-400" /> : <Video className="w-4 h-4 text-indigo-400" />}
                                    <span className="text-xs font-bold text-slate-300 uppercase">{record.type} Response</span>
                                </div>
                                <span className="text-xs text-slate-500 font-mono">{new Date(record.createdAt).toLocaleTimeString()}</span>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Media Player */}
                                <div className="bg-black rounded-lg overflow-hidden border border-slate-800">
                                    {record.type === 'audio' ? (
                                        <audio controls className="w-full h-10" src={`${API_BASE}/${record.path}`} />
                                    ) : (
                                        <video controls className="w-full aspect-video" src={`${API_BASE}/${record.path}`} />
                                    )}
                                </div>

                                {/* Transcript */}
                                {record.transcript && (
                                    <div className="text-sm text-slate-400 italic bg-slate-950/50 p-3 rounded border border-slate-800/50">
                                        "{record.transcript}"
                                    </div>
                                )}

                                {/* AI Card */}
                                {record.analysisJson ? (
                                    <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                                        <div className="flex justify-between items-center pb-2 border-b border-indigo-500/10">
                                            <div className="flex items-center gap-2 text-indigo-300">
                                                <Brain className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-wider">AI Shadow</span>
                                            </div>
                                            <div className="text-lg font-bold text-white">
                                                <span className={record.analysisJson.score >= 7 ? 'text-emerald-400' : 'text-yellow-400'}>
                                                    {record.analysisJson.score}
                                                </span>
                                                <span className="text-slate-600 text-sm">/10</span>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2 text-sm">
                                            <div className="flex gap-2">
                                                <span className="text-slate-500">Emotion:</span>
                                                <span className="text-slate-200">{record.analysisJson.emotion}</span>
                                            </div>
                                            {record.analysisJson.contradiction && (
                                                <div className="flex gap-2 text-red-300 bg-red-950/30 p-2 rounded border border-red-900/30">
                                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                                    <span className="text-xs">{record.analysisJson.contradiction}</span>
                                                </div>
                                            )}
                                            {record.analysisJson.followUpQuestion && (
                                                 <div className="flex gap-2 text-indigo-300 bg-indigo-900/20 p-2 rounded border border-indigo-900/30">
                                                    <Play className="w-4 h-4 shrink-0" />
                                                    <span className="text-xs italic">Suggested Follow-up: {record.analysisJson.followUpQuestion}</span>
                                                 </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-600 text-center py-2 flex items-center justify-center gap-2">
                                        <div className="w-2 h-2 bg-slate-600 rounded-full animate-pulse" />
                                        Processing AI analysis...
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
      </div>

      {toast && (
        <Toast 
            message={toast.msg} 
            type={toast.type} 
            onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}