/**
 * Speech-To-Text Types
 */

export interface STTRequest {
  language?: string;
  format?: string;
  audioBuffer?: ArrayBuffer;
}

export interface STTResponse {
  success: boolean;
  text: string;
  language?: string;
  confidence?: number;
  error?: string;
  timestamp?: number;
}

export interface SpeechRecognitionResult {
  isFinal: boolean;
  transcript: string;
  confidence: number;
}

// WebSocket Message Types
export interface WSMessage {
  type: 'start' | 'audio' | 'end' | 'result' | 'error' | 'ping' | 'pong';
  language?: string;
  audioData?: string; // base64 encoded
  text?: string;
  error?: string;
  timestamp?: number;
  sessionId?: string;
}
