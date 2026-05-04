import React from 'react';
import type { StressState } from '../lib/audioAnalysis';
import { getStressEmoji, getStressColor, getStressLabel } from '../hooks/useStressDetector';
import '../styles/StressIndicator.css';

interface StressIndicatorProps {
  stressState: StressState;
  showAlert?: boolean;
  compact?: boolean;
}

/**
 * Real-time stress indicator component
 * Shows current stress level with visual feedback
 */
export const StressIndicator: React.FC<StressIndicatorProps> = ({
  stressState,
  showAlert = true,
  compact = false,
}) => {
  const emoji = getStressEmoji(stressState.level);
  const color = getStressColor(stressState.level);
  const label = getStressLabel(stressState.level);
  const isRed = stressState.level === 'stressed';

  if (compact) {
    return (
      <div
        className="stress-indicator-compact"
        style={{
          background: color,
        }}
        title={`${label} - Score: ${stressState.currentScore}/100`}
      >
        <span className="stress-emoji">{emoji}</span>
        <span className="stress-score">{stressState.currentScore}</span>
      </div>
    );
  }

  return (
    <div className="stress-indicator">
      <div
        className="stress-meter"
        style={{
          background: `linear-gradient(to right, #10b981 0%, #f59e0b 50%, #ef4444 100%)`,
        }}
      >
        <div
          className="stress-needle"
          style={{
            left: `${stressState.currentScore}%`,
            background: color,
          }}
        />
      </div>

      <div className="stress-info">
        <div className="stress-label">
          <span className="stress-emoji">{emoji}</span>
          <span className="stress-text">{label}</span>
        </div>
        <div className="stress-score-display">{stressState.currentScore}/100</div>
      </div>

      {showAlert && stressState.suggestion && (
        <div
          className={`stress-alert ${isRed ? 'stress-alert--high' : 'stress-alert--moderate'}`}
          style={{
            borderLeftColor: color,
          }}
        >
          <span className="alert-icon">⚠️</span>
          <span className="alert-text">{stressState.suggestion}</span>
        </div>
      )}

      <div className="stress-metrics">
        {stressState.fillerWords.length > 0 && (
          <div className="metric">
            <span className="metric-label">Fillers:</span>
            <span className="metric-value">{stressState.fillerWords.length}</span>
          </div>
        )}
        {stressState.pauseDuration > 0 && (
          <div className="metric">
            <span className="metric-label">Pause:</span>
            <span className="metric-value">{Math.round(stressState.pauseDuration / 1000)}s</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Minimal real-time stress indicator for candidate view
 */
export const StressIndicatorMini: React.FC<{ score: number; level: 'calm' | 'moderate' | 'stressed' }> = ({
  score,
  level,
}) => {
  const color = getStressColor(level);
  const emoji = getStressEmoji(level);

  return (
    <div className="stress-mini">
      <div className="stress-mini-bar" style={{ background: color, width: `${score}%` }} />
      <span className="stress-mini-label">
        {emoji} {score}
      </span>
    </div>
  );
};

/**
 * Status badge showing realtime stress for admin dashboard
 */
export const StressStatusBadge: React.FC<{ level: 'calm' | 'moderate' | 'stressed'; score: number }> = ({
  level,
  score,
}) => {
  const colors = {
    calm: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    moderate: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
    stressed: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  };

  const color = colors[level];
  const emoji = getStressEmoji(level);

  return (
    <div
      className="stress-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '20px',
        background: color.bg,
        border: `1px solid ${color.border}`,
        color: color.text,
        fontSize: '12px',
        fontWeight: '600',
      }}
    >
      <span>{emoji}</span>
      <span>{score}</span>
    </div>
  );
};
