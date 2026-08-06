import type { STTResponse, SpeechRecognitionResult } from './types/stt';

/**
 * Speech-To-Text Service
 * Converts audio to text using Web Speech API or external service
 */

export async function convertAudioToText(
  audioBuffer: ArrayBuffer,
  language: string = 'en-US'
): Promise<STTResponse> {
  try {
    // Option 1: Using Google Cloud Speech-to-Text API (Recommended for production)
    // Set GOOGLE_SPEECH_API_KEY in environment variables
    const apiKey = process.env.GOOGLE_SPEECH_API_KEY;

    if (apiKey) {
      return await googleSpeechToText(audioBuffer, language, apiKey);
    }

    // Option 2: Using Deepgram API (Alternative, very fast)
    const deepgramKey = process.env.DEEPGRAM_API_KEY;
    if (deepgramKey) {
      return await deepgramSpeechToText(audioBuffer, language, deepgramKey);
    }

    // Fallback: Use local web-speech-api (less accurate, but works offline)
    return await localSpeechToText(audioBuffer);
  } catch (error) {
    console.error('STT Error:', error);
    return {
      success: false,
      text: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Google Cloud Speech-to-Text
 * Most accurate and supports 120+ languages
 */
async function googleSpeechToText(
  audioBuffer: ArrayBuffer,
  language: string,
  apiKey: string
): Promise<STTResponse> {
  try {
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: language,
            enableAutomaticPunctuation: true,
            model: 'default',
          },
          audio: {
            content: base64Audio,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Speech API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      results?: Array<{
        alternatives?: Array<{ transcript: string; confidence: number }>;
      }>;
    };

    const transcript =
      data.results?.[0]?.alternatives?.[0]?.transcript || '';
    const confidence =
      data.results?.[0]?.alternatives?.[0]?.confidence || 0;

    return {
      success: !!transcript,
      text: transcript,
      language,
      confidence,
    };
  } catch (error) {
    console.error('Google Speech-to-Text error:', error);
    throw error;
  }
}

/**
 * Deepgram API
 * Fast, accurate, supports 99+ languages
 */
async function deepgramSpeechToText(
  audioBuffer: ArrayBuffer,
  language: string,
  apiKey: string
): Promise<STTResponse> {
  try {
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      body: audioBuffer,
    });

    if (!response.ok) {
      throw new Error(`Deepgram API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{
            transcript: string;
            confidence: number;
          }>;
        }>;
      };
    };

    const transcript =
      data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    const confidence =
      data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;

    return {
      success: !!transcript,
      text: transcript,
      language,
      confidence,
    };
  } catch (error) {
    console.error('Deepgram Speech-to-Text error:', error);
    throw error;
  }
}

/**
 * Local Web Speech API (Fallback)
 * Uses browser's built-in speech recognition
 * Note: This is a server-side simulation and may have limited accuracy
 */
async function localSpeechToText(
  _audioBuffer: ArrayBuffer
): Promise<STTResponse> {
  // In a real scenario, you would use a library like:
  // - node-vosk (offline speech recognition)
  // - pocketsphinx
  // - or implement a WebSocket connection to a recognition service

  return {
    success: false,
    text: '',
    error:
      'No speech recognition service configured. Please set GOOGLE_SPEECH_API_KEY or DEEPGRAM_API_KEY environment variables.',
  };
}

/**
 * Utility: Convert various audio formats to WAV/PCM
 */
export async function convertAudioFormat(
  buffer: ArrayBuffer,
  fromFormat: string,
  toFormat: string = 'wav'
): Promise<ArrayBuffer> {
  // For production, use a library like:
  // - ffmpeg.js
  // - audiobuffer-to-wav
  // - wav library

  if (fromFormat === toFormat) {
    return buffer;
  }

  // Placeholder implementation
  console.warn(
    `Audio format conversion from ${fromFormat} to ${toFormat} not fully implemented`
  );
  return buffer;
}
