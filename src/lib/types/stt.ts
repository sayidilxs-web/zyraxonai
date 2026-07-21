export interface STTRequest {
  audio: Blob | ArrayBuffer;
  language?: string;
  format?: 'wav' | 'mp3' | 'webm' | 'ogg';
}

export interface STTResponse {
  success: boolean;
  text: string;
  language?: string;
  confidence?: number;
  error?: string;
}

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  language?: string;
}
