import React, { useMemo } from 'react';
import type { StressState } from '../lib/audioAnalysis';
import '../styles/StressGraph.css';

interface StressGraphProps {
  stressHistory: StressState[];
  title?: string;
  compact?: boolean;
}

/**
 * Post-interview stress trajectory visualization
 * Shows how stress evolved over time
 */
export const StressTrajectoryGraph: React.FC<StressGraphProps> = ({
  stressHistory,
  title = 'Interview Stress Trajectory',
  compact = false,
}) => {
  const data = useMemo(() => {
    if (stressHistory.length === 0) return [];

    // Convert to chart data with relative timestamps
    const startTime = stressHistory[0].timestamp;
    return stressHistory.map((point, index) => ({
      index,
      time: Math.round((point.timestamp - startTime) / 1000), // seconds
      stress: point.currentScore,
      level: point.level,
      fillers: point.fillerWords.length,
      pause: Math.round(point.pauseDuration / 1000),
    }));
  }, [stressHistory]);

  if (data.length === 0) {
    return (
      <div className="stress-graph-empty">
        <p>No stress data available for this interview.</p>
      </div>
    );
  }

  const width = 900;
  const height = compact ? 180 : 320;
  const padding = compact ? 18 : 28;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const pathPoints = data.map((point, index) => {
    const x = padding + (data.length === 1 ? innerWidth / 2 : (index / (data.length - 1)) * innerWidth);
    const y = padding + (1 - point.stress / 100) * innerHeight;
    return { x, y, ...point };
  });

  const linePath = pathPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = `${linePath} L ${pathPoints[pathPoints.length - 1].x} ${height - padding} L ${pathPoints[0].x} ${height - padding} Z`;

  // Calculate statistics
  const stats = useMemo(() => {
    const scores = data.map(d => d.stress);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const trend = scores[scores.length - 1] - scores[0]; // Final - Initial

    return {
      avgScore,
      maxScore,
      minScore,
      trend,
      trendDirection: trend > 0 ? 'increased' : trend < 0 ? 'decreased' : 'stable',
    };
  }, [data]);

  if (compact) {
    return (
      <div className="stress-graph-compact">
        <svg viewBox={`0 0 ${width} ${height}`} className="stress-graph-svg" role="img" aria-label={title}>
          <defs>
            <linearGradient id="stressGradientCompact" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#stressGradientCompact)" />
          <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {pathPoints.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r="4" fill={point.stress < 30 ? '#10b981' : point.stress < 70 ? '#f59e0b' : '#ef4444'} />
          ))}
        </svg>
        <div className="compact-legend">{title}</div>
      </div>
    );
  }

  return (
    <div className="stress-graph">
      <div className="graph-header">
        <h3 className="graph-title">{title}</h3>
        <p className="graph-subtitle">How stress levels evolved during the interview</p>
      </div>

      <div className="graph-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="stress-graph-svg" role="img" aria-label={title}>
          <defs>
            <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.04} />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((tick) => {
            const y = padding + (1 - tick / 100) * innerHeight;
            return (
              <g key={tick}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e5e7eb" strokeDasharray="4 6" />
                <text x={8} y={y + 4} fill="#9ca3af" fontSize="11">{tick}</text>
              </g>
            );
          })}

          <path d={areaPath} fill="url(#stressGradient)" />
          <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

          {pathPoints.map((point, index) => (
            <g key={index}>
              <circle cx={point.x} cy={point.y} r="5" fill={point.stress < 30 ? '#10b981' : point.stress < 70 ? '#f59e0b' : '#ef4444'} />
              <title>{`Time ${point.time}s, Stress ${point.stress}`}</title>
            </g>
          ))}

          {pathPoints.map((point) => (
            <text
              key={`label-${point.index}`}
              x={point.x}
              y={height - 8}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="11"
            >
              {point.time}s
            </text>
          ))}
        </svg>
      </div>

      {/* Statistics Cards */}
      <div className="stress-stats">
        <div className="stat-card">
          <div className="stat-label">Average Stress</div>
          <div className="stat-value">{stats.avgScore}</div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill"
              style={{
                width: `${stats.avgScore}%`,
                background: stats.avgScore < 30 ? '#10b981' : stats.avgScore < 70 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Peak Stress</div>
          <div className="stat-value">{stats.maxScore}</div>
          <div className="stat-indicator">
            {stats.maxScore >= 70 && <span className="badge badge-red">High</span>}
            {stats.maxScore >= 30 && stats.maxScore < 70 && <span className="badge badge-yellow">Moderate</span>}
            {stats.maxScore < 30 && <span className="badge badge-green">Calm</span>}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Stress Trend</div>
          <div className="stat-value">{Math.abs(stats.trend).toFixed(1)}</div>
          <div className="trend-indicator">
            {stats.trendDirection === 'increased' && (
              <>
                <span className="trend-arrow">📈</span>
                <span className="trend-text">Increased</span>
              </>
            )}
            {stats.trendDirection === 'decreased' && (
              <>
                <span className="trend-arrow">📉</span>
                <span className="trend-text">Decreased</span>
              </>
            )}
            {stats.trendDirection === 'stable' && (
              <>
                <span className="trend-arrow">➡️</span>
                <span className="trend-text">Stable</span>
              </>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Lowest Stress</div>
          <div className="stat-value">{stats.minScore}</div>
          <div className="stat-time">
            Calmest moment during interview
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="stress-insights">
        <h4>Key Insights</h4>
        <ul className="insights-list">
          {stats.avgScore < 30 && (
            <li className="insight insight-positive">
              ✨ Candidate remained calm throughout the interview
            </li>
          )}
          {stats.avgScore >= 30 && stats.avgScore < 70 && (
            <li className="insight insight-neutral">
              ⚡ Candidate showed moderate stress levels, which is normal
            </li>
          )}
          {stats.avgScore >= 70 && (
            <li className="insight insight-warning">
              ⚠️ High stress levels detected. Questions may have been too difficult
            </li>
          )}

          {stats.trendDirection === 'increased' && (
            <li className="insight insight-warning">
              📈 Stress increased over time. Interview became progressively harder
            </li>
          )}
          {stats.trendDirection === 'decreased' && (
            <li className="insight insight-positive">
              📉 Stress decreased over time. Candidate became more comfortable
            </li>
          )}

          {stats.maxScore - stats.minScore > 40 && (
            <li className="insight insight-warning">
              🎯 Large fluctuations in stress. Some questions were significantly more difficult
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

/**
 * Stress level summary badge for quick reference
 */
export const StressSummary: React.FC<{ history: StressState[] }> = ({ history }) => {
  const analysis = useMemo(() => {
    if (history.length === 0) return null;

    const scores = history.map(h => h.currentScore);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const calmCount = history.filter(h => h.level === 'calm').length;
    const moderateCount = history.filter(h => h.level === 'moderate').length;
    const stressedCount = history.filter(h => h.level === 'stressed').length;

    return {
      avgScore: avg,
      calmPercent: Math.round((calmCount / history.length) * 100),
      moderatePercent: Math.round((moderateCount / history.length) * 100),
      stressedPercent: Math.round((stressedCount / history.length) * 100),
    };
  }, [history]);

  if (!analysis) return null;

  return (
    <div className="stress-summary">
      <div className="summary-main">
        <div className="summary-score">
          <span className="score-value">{analysis.avgScore}</span>
          <span className="score-label">Average Stress</span>
        </div>
        <div className="summary-breakdown">
          <div className="breakdown-item">
            <div className="breakdown-bar" style={{ background: '#10b981', height: `${analysis.calmPercent}%` }} />
            <span className="breakdown-label">{analysis.calmPercent}% Calm</span>
          </div>
          <div className="breakdown-item">
            <div className="breakdown-bar" style={{ background: '#f59e0b', height: `${analysis.moderatePercent}%` }} />
            <span className="breakdown-label">{analysis.moderatePercent}% Moderate</span>
          </div>
          <div className="breakdown-item">
            <div className="breakdown-bar" style={{ background: '#ef4444', height: `${analysis.stressedPercent}%` }} />
            <span className="breakdown-label">{analysis.stressedPercent}% Stressed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
