/**
 * Complete STT Client Example
 * Use this as a reference for your application
 */

export interface STTConfig {
  apiUrl: string;
  language: string;
  format: 'wav' | 'mp3' | 'webm' | 'ogg';
  maxRecordingTime: number; // in milliseconds
  onStart?: () => void;
  onStop?: () => void;
  onProcessing?: () => void;
  onSuccess?: (text: string, confidence: number) => void;
  onError?: (error: string) => void;
}

export class STTClient {
  private config: STTConfig;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingTimeout: NodeJS.Timeout | null = null;

  constructor(config: Partial<STTConfig> = {}) {
    this.config = {
      apiUrl: config.apiUrl || '/api/public/stt',
      language: config.language || 'en-US',
      format: config.format || 'webm',
      maxRecordingTime: config.maxRecordingTime || 30000, // 30 seconds
      ...config,
    };
  }

  /**
   * Start recording audio from microphone
   */
  async startRecording(): Promise<void> {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create MediaRecorder
      const mimeType = this.getMimeType();
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      this.audioChunks = [];

      // Collect audio data
      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        this.audioChunks.push(event.data);
      };

      // Handle when recording stops
      this.mediaRecorder.onstop = async () => {
        await this.handleRecordingStop();
      };

      // Start recording
      this.mediaRecorder.start();
      this.config.onStart?.();

      // Auto-stop after max recording time
      this.recordingTimeout = setTimeout(() => {
        this.stopRecording();
      }, this.config.maxRecordingTime);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Recording error:', errorMessage);
      this.config.onError?.(errorMessage);
    }
  }

  /**
   * Stop recording audio
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.config.onStop?.();

      // Stop all audio tracks
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    // Clear timeout
    if (this.recordingTimeout) {
      clearTimeout(this.recordingTimeout);
    }
  }

  /**
   * Handle recording completion and send to backend
   */
  private async handleRecordingStop(): Promise<void> {
    if (this.audioChunks.length === 0) {
      this.config.onError?.('No audio recorded');
      return;
    }

    // Create audio blob
    const mimeType = this.getMimeType();
    const audioBlob = new Blob(this.audioChunks, { type: mimeType });

    // Clear chunks
    this.audioChunks = [];

    // Send to backend
    await this.sendToBackend(audioBlob);
  }

  /**
   * Send audio to backend for conversion
   */
  private async sendToBackend(audioBlob: Blob): Promise<void> {
    try {
      this.config.onProcessing?.();

      // Build query parameters
      const params = new URLSearchParams({
        language: this.config.language,
        format: this.config.format,
      });

      const url = `${this.config.apiUrl}?${params.toString()}`;

      // Send POST request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: audioBlob,
      });

      // Parse response
      const result = await response.json();

      if (result.success && result.text) {
        this.config.onSuccess?.(result.text, result.confidence || 0);
      } else {
        this.config.onError?.(result.error || 'Failed to convert audio');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      console.error('Backend request error:', errorMessage);
      this.config.onError?.(errorMessage);
    }
  }

  /**
   * Get appropriate MIME type for browser
   */
  private getMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm;codecs=vp8',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<STTConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  /**
   * Get supported languages
   */
  static getSupportedLanguages(): Record<string, string> {
    return {
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'bn-IN': 'Bengali (India)',
      'bn-BD': 'Bengali (Bangladesh)',
      'hi-IN': 'Hindi (India)',
      'fr-FR': 'French',
      'es-ES': 'Spanish',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'ja-JP': 'Japanese',
      'zh-CN': 'Chinese (Simplified)',
      'zh-TW': 'Chinese (Traditional)',
      'ar-SA': 'Arabic',
      'pt-BR': 'Portuguese (Brazil)',
      'ru-RU': 'Russian',
      'ko-KR': 'Korean',
      'th-TH': 'Thai',
      'vi-VN': 'Vietnamese',
    };
  }
}

/**
 * Usage Example
 */
export function exampleUsage() {
  // Initialize STT client
  const sttClient = new STTClient({
    apiUrl: 'https://yourwebsite.com/api/public/stt',
    language: 'bn-IN', // Bengali
    maxRecordingTime: 30000, // 30 seconds
    onStart: () => {
      console.log('🎤 Recording started...');
    },
    onProcessing: () => {
      console.log('⏳ Processing audio...');
    },
    onSuccess: (text, confidence) => {
      console.log('✅ Converted text:', text);
      console.log('📊 Confidence:', (confidence * 100).toFixed(1) + '%');
    },
    onError: (error) => {
      console.error('❌ Error:', error);
    },
    onStop: () => {
      console.log('⏹️ Recording stopped');
    },
  });

  // Start recording
  const startBtn = document.getElementById('start-btn');
  startBtn?.addEventListener('click', () => {
    sttClient.startRecording();
  });

  // Stop recording
  const stopBtn = document.getElementById('stop-btn');
  stopBtn?.addEventListener('click', () => {
    sttClient.stopRecording();
  });
}
