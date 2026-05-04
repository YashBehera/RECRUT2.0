/**
 * Real-Time Audio Analysis for Stress & Cognitive Load Detection
 * Analyzes voice patterns during interview responses
 */

export interface AudioMetrics {
  timestamp: number;
  silenceDuration: number; // ms of silence
  speechRate: number; // words per minute
  pauseCount: number;
  fillerWords: string[]; // detected "um", "ah", etc.
  fillerCount: number;
  pitchVariation: number; // 0-1 scale, higher = more variation
  averagePitch: number; // Hz
  energyLevel: number; // 0-1 scale
  stressScore: number; // 0-100
}

export interface StressState {
  currentScore: number;
  level: 'calm' | 'moderate' | 'stressed'; // 🟢 🟡 🔴
  fillerWords: string[];
  pauseDuration: number;
  suggestion?: string;
  timestamp: number;
}

// Filler words and hesitations to detect
const FILLER_WORDS = ['um', 'uh', 'ah', 'er', 'erm', 'like', 'you know', 'kind of', 'sort of'];
const MIN_PAUSE_DURATION = 800; // ms - threshold for "long pause"

/**
 * Analyze audio chunk for stress indicators
 * Uses Web Audio API for frequency and energy analysis
 */
export async function analyzeAudioChunk(
  audioBuffer: AudioBuffer
): Promise<AudioMetrics> {
  const now = Date.now();
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  // 1. Calculate energy level (RMS)
  const energyLevel = calculateRMS(channelData);

  // 2. Calculate pitch variation using autocorrelation
  const { pitch: averagePitch, variation: pitchVariation } = detectPitch(channelData, sampleRate);

  // 3. Detect pauses/silence
  const { silenceDuration, pauseCount } = detectPauses(channelData, sampleRate, energyLevel);

  // 4. Speech rate estimation (from energy peaks)
  const speechRate = estimateSpeechRate(channelData, sampleRate);

  return {
    timestamp: now,
    silenceDuration,
    speechRate,
    pauseCount,
    fillerWords: [],
    fillerCount: 0,
    pitchVariation,
    averagePitch,
    energyLevel,
    stressScore: 0, // Will be calculated by aggregator
  };
}

/**
 * Analyze text transcript for filler words and hesitations
 * Called after speech-to-text transcription
 */
export function analyzeTranscriptForFillers(transcript: string): {
  fillerWords: string[];
  fillerCount: number;
  fillerDensity: number; // fillers per 100 words
} {
  const lowerTranscript = transcript.toLowerCase();
  const words = lowerTranscript.split(/\s+/).filter(w => w.length > 0);
  const totalWords = words.length;

  const detectedFillers: string[] = [];

  // Check for each filler word
  for (const filler of FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lowerTranscript.match(regex);
    if (matches) {
      detectedFillers.push(...matches.map(() => filler));
    }
  }

  const fillerDensity = totalWords > 0 ? (detectedFillers.length / totalWords) * 100 : 0;

  return {
    fillerWords: detectedFillers,
    fillerCount: detectedFillers.length,
    fillerDensity,
  };
}

/**
 * Calculate RMS (Root Mean Square) energy level
 * Higher values indicate louder speech
 */
function calculateRMS(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  const rms = Math.sqrt(sum / data.length);
  // Normalize to 0-1 (typical speech is 0.1-0.5)
  return Math.min(1, rms * 4);
}

/**
 * Detect fundamental frequency (pitch) using autocorrelation
 * More sophisticated than simple FFT for voice analysis
 */
function detectPitch(data: Float32Array, sampleRate: number): { pitch: number; variation: number } {
  const size = Math.min(data.length, sampleRate / 50); // Use ~20ms window

  // Calculate autocorrelation
  let maxCorr = 0;
  let maxLag = 0;

  for (let lag = 40; lag < size / 2; lag++) {
    let sum = 0;
    for (let i = 0; i < size - lag; i++) {
      sum += data[i] * data[i + lag];
    }
    if (sum > maxCorr) {
      maxCorr = sum;
      maxLag = lag;
    }
  }

  // Estimate pitch from lag (male voice: 80-180Hz, female: 150-300Hz)
  const estimatedPitch = maxLag > 0 ? sampleRate / maxLag : 100;

  // Pitch variation (simplified - fluctuation in frequency)
  // In a real app, track pitch over time window
  const variation = Math.random() * 0.5; // Placeholder - would track real variation

  return {
    pitch: Math.min(300, Math.max(80, estimatedPitch)), // Clamp to voice range
    variation,
  };
}

/**
 * Detect pauses and silence in speech
 * Long pauses indicate thinking/cognitive load
 */
function detectPauses(
  data: Float32Array,
  sampleRate: number,
  energyThreshold: number
): { silenceDuration: number; pauseCount: number } {
  const windowSize = sampleRate / 50; // 20ms windows
  let silenceDuration = 0;
  let pauseCount = 0;
  let inSilence = false;
  let silenceStart = 0;

  // Use lower threshold for silence detection
  const SILENCE_THRESHOLD = energyThreshold * 0.3;

  for (let i = 0; i < data.length; i += windowSize) {
    const chunk = data.slice(i, i + windowSize);
    const chunkEnergy = calculateRMS(chunk);

    if (chunkEnergy < SILENCE_THRESHOLD) {
      if (!inSilence) {
        inSilence = true;
        silenceStart = i;
      }
    } else {
      if (inSilence) {
        const pauseDuration = (i - silenceStart) / sampleRate * 1000; // Convert to ms
        if (pauseDuration > MIN_PAUSE_DURATION) {
          pauseCount++;
          silenceDuration += pauseDuration;
        }
        inSilence = false;
      }
    }
  }

  return { silenceDuration, pauseCount };
}

/**
 * Estimate speech rate from energy peaks
 * Peaks in energy correspond roughly to syllables
 */
function estimateSpeechRate(data: Float32Array, sampleRate: number): number {
  const windowSize = sampleRate / 100; // 10ms windows
  const peakThreshold = 0.1;
  let peakCount = 0;

  let prevEnergy = 0;
  for (let i = 0; i < data.length; i += windowSize) {
    const chunk = data.slice(i, i + windowSize);
    const energy = calculateRMS(chunk);

    // Detect peaks (energy crosses threshold going up)
    if (prevEnergy < peakThreshold && energy >= peakThreshold) {
      peakCount++;
    }
    prevEnergy = energy;
  }

  // Estimate WPM (words per minute)
  // Assume ~4 syllables per word, peak ≈ syllable
  const duration = data.length / sampleRate; // seconds
  const estimatedWords = peakCount / 4; // ~4 syllables per word
  const wpm = (estimatedWords / duration) * 60;

  return Math.max(0, Math.min(300, wpm)); // Clamp to reasonable range
}

/**
 * Calculate stress score from multiple metrics
 * 0-30: Calm (🟢)
 * 31-70: Moderate (🟡)
 * 71-100: Stressed (🔴)
 */
export function calculateStressScore(metrics: AudioMetrics, transcriptMetrics?: { fillerDensity: number }): number {
  let score = 0;

  // 1. Filler word density (0-30 points)
  // High fillers = high cognitive load
  if (transcriptMetrics) {
    const fillerScore = Math.min(30, transcriptMetrics.fillerDensity * 5);
    score += fillerScore;
  }

  // 2. Pause duration (0-25 points)
  // Longer pauses = thinking hard = stress
  const pauseScore = Math.min(25, (metrics.silenceDuration / 2000) * 25);
  score += pauseScore;

  // 3. Speech rate deviation (0-20 points)
  // Too fast (>150 WPM) or too slow (<60 WPM) = stress
  const normalWPM = 120;
  const rateDeviation = Math.abs(metrics.speechRate - normalWPM) / normalWPM;
  const rateScore = Math.min(20, rateDeviation * 50);
  score += rateScore;

  // 4. Low energy (0-15 points)
  // Very low energy can indicate low mood/stress
  if (metrics.energyLevel < 0.2) {
    score += 15;
  } else if (metrics.energyLevel < 0.4) {
    score += 10;
  }

  // 5. Pitch variation (0-10 points)
  // Higher variation = more expressiveness = less stress
  // So we subtract from score
  const pitchScore = Math.max(0, 10 - metrics.pitchVariation * 20);
  score -= pitchScore;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Determine stress level category
 */
export function getStressLevel(score: number): 'calm' | 'moderate' | 'stressed' {
  if (score < 30) return 'calm';
  if (score < 70) return 'moderate';
  return 'stressed';
}

/**
 * Get stress-based suggestion for interviewer
 */
export function getStressSuggestion(
  stressLevel: 'calm' | 'moderate' | 'stressed',
  pauseDuration: number,
  fillerCount: number
): string | undefined {
  if (stressLevel === 'stressed') {
    if (pauseDuration > 5000) {
      return '⚠️ Candidate showing signs of stress with long pauses. Consider offering a brief break.';
    }
    if (fillerCount > 10) {
      return '⚠️ High cognitive load detected (many fillers). Question might be too difficult.';
    }
    return '⚠️ Candidate showing elevated stress levels. Consider a simpler follow-up question.';
  }

  if (stressLevel === 'moderate' && pauseDuration > 3000) {
    return '💡 Consider simplifying the question or offering more context.';
  }

  return undefined;
}

/**
 * Aggregate metrics over time window for smooth stress tracking
 */
export function aggregateMetrics(metricsWindow: AudioMetrics[]): AudioMetrics {
  if (metricsWindow.length === 0) {
    return {
      timestamp: Date.now(),
      silenceDuration: 0,
      speechRate: 0,
      pauseCount: 0,
      fillerWords: [],
      fillerCount: 0,
      pitchVariation: 0,
      averagePitch: 0,
      energyLevel: 0,
      stressScore: 0,
    };
  }

  const avg = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

  return {
    timestamp: metricsWindow[metricsWindow.length - 1].timestamp,
    silenceDuration: avg(metricsWindow.map(m => m.silenceDuration)),
    speechRate: avg(metricsWindow.map(m => m.speechRate)),
    pauseCount: Math.round(avg(metricsWindow.map(m => m.pauseCount))),
    fillerWords: metricsWindow.flatMap(m => m.fillerWords),
    fillerCount: metricsWindow.reduce((sum, m) => sum + m.fillerCount, 0),
    pitchVariation: avg(metricsWindow.map(m => m.pitchVariation)),
    averagePitch: avg(metricsWindow.map(m => m.averagePitch)),
    energyLevel: avg(metricsWindow.map(m => m.energyLevel)),
    stressScore: avg(metricsWindow.map(m => m.stressScore)),
  };
}
