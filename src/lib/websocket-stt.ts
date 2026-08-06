/**
 * WebSocket-based Real-Time Speech-To-Text Service
 * Handles real-time audio streaming and text conversion
 */

import type { WSMessage, STTResponse } from './types/stt';

export class WebSocketSTTClient {
  private ws: WebSocket | null = null;
  private url: string;
  private language: string = 'en-US';
  private isConnected: boolean = false;
  private sessionId: string = '';
  private audioBuffer: AudioBuffer[] = [];
  private recognitionContext: AudioContext | null = null;
  private recognizer: ((result: string) => void) | null = null;
  private onTextCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor(url: string, language: string = 'en-US') {
    this.url = url;
    this.language = language;
    this.sessionId = this.generateSessionId();
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('[WebSocket STT] Connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.sendMessage({
            type: 'start',
            language: this.language,
            sessionId: this.sessionId,
          });
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket STT] Connection error:', error);
          this.isConnected = false;
          this.onErrorCallback?.('WebSocket connection error');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WebSocket STT] Disconnected');
          this.isConnected = false;
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('[WebSocket STT] Connection failed:', error);
        this.isConnected = false;
        reject(error);
      }
    });
  }

  /**
   * Send audio chunk to server
   */
  sendAudioChunk(audioData: ArrayBuffer): void {
    if (!this.isConnected || !this.ws) {
      console.error('[WebSocket STT] Not connected');
      return;
    }

    const base64Audio = this.arrayBufferToBase64(audioData);
    this.sendMessage({
      type: 'audio',
      audioData: base64Audio,
      sessionId: this.sessionId,
    });
  }

  /**
   * End audio stream and get final result
   */
  endStream(): void {
    if (!this.isConnected || !this.ws) {
      console.error('[WebSocket STT] Not connected');
      return;
    }

    this.sendMessage({
      type: 'end',
      sessionId: this.sessionId,
    });
  }

  /**
   * Set callback for text results
   */
  onText(callback: (text: string) => void): void {
    this.onTextCallback = callback;
  }

  /**
   * Set callback for errors
   */
  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  /**
   * Get connection status
   */
  getStatus(): {
    isConnected: boolean;
    sessionId: string;
    language: string;
  } {
    return {
      isConnected: this.isConnected,
      sessionId: this.sessionId,
      language: this.language,
    };
  }

  /**
   * Private: Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message: WSMessage = JSON.parse(data);

      switch (message.type) {
        case 'result':
          console.log('[WebSocket STT] Result:', message.text);
          this.onTextCallback?.(message.text || '');
          break;

        case 'error':
          console.error('[WebSocket STT] Server error:', message.error);
          this.onErrorCallback?.(message.error || 'Unknown error');
          break;

        case 'pong':
          console.log('[WebSocket STT] Pong received');
          break;

        default:
          console.log('[WebSocket STT] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[WebSocket STT] Failed to parse message:', error);
    }
  }

  /**
   * Private: Send message to server
   */
  private sendMessage(message: WSMessage): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Private: Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(
        `[WebSocket STT] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
      );

      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('[WebSocket STT] Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('[WebSocket STT] Max reconnection attempts reached');
      this.onErrorCallback?.('Failed to reconnect after multiple attempts');
    }
  }

  /**
   * Private: Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private: Convert ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

/**
 * Audio Capture from Microphone
 */
export class AudioCaptureService {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isRecording: boolean = false;
  private onAudioChunk: ((chunk: ArrayBuffer) => void) | null = null;
  private sampleRate: number = 16000;

  /**
   * Start recording from microphone
   */
  async startRecording(
    onAudioChunk: (chunk: ArrayBuffer) => void
  ): Promise<void> {
    try {
      this.onAudioChunk = onAudioChunk;

      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this.audioContext.resume();

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create script processor for audio chunks
      this.processor = this.audioContext.createScriptProcessor(
        4096,
        1,
        1
      );

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.processor.onaudioprocess = (event) => {
        const audioData = event.inputBuffer.getChannelData(0);
        const pcmData = this.downsampleAudio(audioData);
        this.onAudioChunk?.(pcmData.buffer as ArrayBuffer);
      };

      this.isRecording = true;
      console.log('[AudioCapture] Recording started');
    } catch (error) {
      console.error('[AudioCapture] Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  stopRecording(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isRecording = false;
    console.log('[AudioCapture] Recording stopped');
  }

  /**
   * Get recording status
   */
  isRecordingActive(): boolean {
    return this.isRecording;
  }

  /**
   * Private: Downsample audio to 16kHz PCM
   */
  private downsampleAudio(
    audioData: Float32Array,
    targetSampleRate: number = 16000
  ): Int16Array {
    const currentSampleRate = this.audioContext?.sampleRate || 44100;
    const ratio = currentSampleRate / targetSampleRate;
    const newLength = Math.ceil(audioData.length / ratio);
    const result = new Int16Array(newLength);

    let pointerIn = 0;
    let pointerOut = 0;

    while (pointerIn < audioData.length) {
      const a = audioData[Math.floor(pointerIn)];
      const b = audioData[Math.ceil(pointerIn)];
      const fraction = pointerIn - Math.floor(pointerIn);
      const sample = a + (b - a) * fraction;

      result[pointerOut] = Math.max(-1, Math.min(1, sample)) < 0 
        ? sample * 0x8000 
        : sample * 0x7fff;

      pointerIn += ratio;
      pointerOut++;
    }

    return result;
  }
}
