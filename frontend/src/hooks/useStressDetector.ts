/**
 * Real-Time Stress & Cognitive Load Detector Hook
 * Monitors audio during interview and calculates stress metrics
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import {
  analyzeAudioChunk,
  analyzeTranscriptForFillers,
  calculateStressScore,
  getStressLevel,
  getStressSuggestion,
  aggregateMetrics,
  type AudioMetrics,
  type StressState,
} from '../lib/audioAnalysis';

interface UseStressDetectorProps {
  enabled: boolean;
  onStressUpdate?: (state: StressState) => void;
  analysisIntervalMs?: number; // How often to update stress score
}

export function useStressDetector({ enabled, onStressUpdate, analysisIntervalMs = 3000 }: UseStressDetectorProps) {
  const [stressState, setStressState] = useState<StressState>({
    currentScore: 0,
    level: 'calm',
    fillerWords: [],
    pauseDuration: 0,
    timestamp: Date.now(),
  });

  const [stressHistory, setStressHistory] = useState<StressState[]>([]);

  // Refs to track state
  const metricsBufferRef = useRef<AudioMetrics[]>([]);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestTranscriptRef = useRef<string>('');
  const latestTranscriptMetricsRef = useRef<{ fillerDensity: number } | undefined>(undefined);

  /**
   * Update stress state and trigger callback
   */
  const updateStressState = useCallback((metrics: AudioMetrics, transcriptMetrics?: { fillerDensity: number }) => {
    const stressScore = calculateStressScore(metrics, transcriptMetrics);
    const level = getStressLevel(stressScore);
    const suggestion = getStressSuggestion(level, metrics.silenceDuration, metrics.fillerCount);

    const newState: StressState = {
      currentScore: stressScore,
      level,
      fillerWords: metrics.fillerWords,
      pauseDuration: metrics.silenceDuration,
      suggestion,
      timestamp: Date.now(),
    };

    setStressState(newState);
    setStressHistory(prev => [...prev, newState]);

    if (onStressUpdate) {
      onStressUpdate(newState);
    }

    // Log for debugging
    console.log(`📊 [STRESS] Score: ${stressScore} (${level}) | Pauses: ${metrics.pauseCount} | Fillers: ${metrics.fillerCount}`);
  }, [onStressUpdate]);

  /**
   * Setup audio analysis processor
   */
  const setupAudioAnalyzer = useCallback(async (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // Create script processor for real-time analysis
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      audioProcessorRef.current = processor;

      let audioChunkBuffer: Float32Array[] = [];
      const BUFFER_SIZE = 8; // Accumulate 8 chunks before analyzing

      processor.onaudioprocess = async (e) => {
        if (!enabled) return;

        const inputData = e.inputBuffer.getChannelData(0);
        audioChunkBuffer.push(new Float32Array(inputData));

        // Analyze when buffer is full
        if (audioChunkBuffer.length >= BUFFER_SIZE) {
          // Combine chunks
          const totalLength = audioChunkBuffer.reduce((sum, arr) => sum + arr.length, 0);
          const combined = new Float32Array(totalLength);
          let offset = 0;

          for (const chunk of audioChunkBuffer) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }

          // Create audio buffer and analyze
          const audioBuffer = audioContext.createBuffer(1, combined.length, audioContext.sampleRate);
          audioBuffer.getChannelData(0).set(combined);

          const metrics = await analyzeAudioChunk(audioBuffer);
          metricsBufferRef.current.push(metrics);

          audioChunkBuffer = [];
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      console.log('🎤 [STRESS] Audio analyzer initialized');
    } catch (err) {
      console.error('Failed to setup audio analyzer:', err);
    }
  }, [enabled]);

  /**
   * Cleanup audio analyzer
   */
  const cleanupAnalyzer = useCallback(() => {
    if (analysisTimerRef.current) {
      clearInterval(analysisTimerRef.current);
    }

    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  }, []);

  /**
   * Analyze transcript for filler words
   * Call this when speech-to-text is available
   */
  const analyzeTranscript = useCallback((transcript: string) => {
    if (!transcript) return;

    latestTranscriptRef.current = transcript;
    const fillerMetrics = analyzeTranscriptForFillers(transcript);
    latestTranscriptMetricsRef.current = { fillerDensity: fillerMetrics.fillerDensity };

    console.log(`📝 [STRESS] Filler analysis: ${fillerMetrics.fillerCount} fillers (${fillerMetrics.fillerDensity.toFixed(1)}% density)`);
  }, []);

  /**
   * Start stress monitoring on given audio stream
   */
  const startMonitoring = useCallback(async (stream: MediaStream) => {
    if (!enabled) return;

    metricsBufferRef.current = [];
    setStressHistory([]);

    await setupAudioAnalyzer(stream);

    // Start periodic analysis
    analysisTimerRef.current = setInterval(() => {
      if (metricsBufferRef.current.length > 0) {
        const aggregated = aggregateMetrics(metricsBufferRef.current);

        // Get filler metrics from latest transcript
        const transcriptMetrics = latestTranscriptMetricsRef.current;

        updateStressState(aggregated, transcriptMetrics);

        // Keep only recent metrics for ongoing analysis
        metricsBufferRef.current = metricsBufferRef.current.slice(-5);
      }
    }, analysisIntervalMs);
  }, [enabled, setupAudioAnalyzer, updateStressState, analysisIntervalMs]);

  /**
   * Stop stress monitoring
   */
  const stopMonitoring = useCallback(() => {
    cleanupAnalyzer();
  }, [cleanupAnalyzer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAnalyzer();
    };
  }, [cleanupAnalyzer]);

  return {
    stressState,
    stressHistory,
    startMonitoring,
    stopMonitoring,
    analyzeTranscript,
  };
}

/**
 * Get emoji indicator for stress level
 */
export function getStressEmoji(level: 'calm' | 'moderate' | 'stressed'): string {
  switch (level) {
    case 'calm':
      return '🟢';
    case 'moderate':
      return '🟡';
    case 'stressed':
      return '🔴';
  }
}

/**
 * Get color for stress visualization
 */
export function getStressColor(level: 'calm' | 'moderate' | 'stressed'): string {
  switch (level) {
    case 'calm':
      return '#10b981'; // Green
    case 'moderate':
      return '#f59e0b'; // Amber
    case 'stressed':
      return '#ef4444'; // Red
  }
}

/**
 * Get readable stress label
 */
export function getStressLabel(level: 'calm' | 'moderate' | 'stressed'): string {
  switch (level) {
    case 'calm':
      return 'Calm';
    case 'moderate':
      return 'Moderate Stress';
    case 'stressed':
      return 'High Stress';
  }
}
