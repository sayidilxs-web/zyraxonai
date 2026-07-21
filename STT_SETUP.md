# Speech-To-Text (STT) Endpoint Setup Guide

## Overview

Your application now has a complete STT (Speech-To-Text) system:

```
┌──────────────────────────────────────────────────────────────────┐
│  Your Mobile/Desktop Application                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 1. User speaks into microphone                              │ │
│  │ 2. Audio captured and sent to backend                       │ │
│  │ 3. Receive text response                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              ↓ (POST /api/public/stt)
┌──────────────────────────────────────────────────────────────────┐
│  Your Website Backend (zyraxonai)                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Endpoint: /api/public/stt                                   │ │
│  │ Receives: Binary audio data                                 │ │
│  │ Processes: Audio → Text conversion (Google/Deepgram)        │ │
│  │ Returns: JSON with converted text                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### Step 1: Choose STT Service

You have 2 options (or use both):

#### Option A: Google Cloud Speech-to-Text (Recommended)

**Pros:**
- Most accurate (99%+ accuracy)
- Supports 120+ languages
- Best for production

**Setup:**
1. Go to https://console.cloud.google.com/
2. Create a new project
3. Enable "Cloud Speech-to-Text API"
4. Create an API key (Credentials → API Key)
5. Copy the API key
6. Add to your `.env` file:
   ```
   GOOGLE_SPEECH_API_KEY=your_key_here
   ```

#### Option B: Deepgram API (Faster)

**Pros:**
- Very fast processing
- 99+ languages supported
- Good for real-time applications

**Setup:**
1. Go to https://console.deepgram.com/
2. Sign up for free account
3. Get your API key from dashboard
4. Add to your `.env` file:
   ```
   DEEPGRAM_API_KEY=your_key_here
   ```

### Step 2: Environment Variables

```bash
cp .env.example .env
# Edit .env and add your API keys
```

### Step 3: Install Dependencies

```bash
bun install
# or
npm install
```

### Step 4: Start Backend

```bash
bun run dev
# Your backend is now running at http://localhost:5173
```

---

## How to Use in Your Application

### Method 1: Browser/Web Application

```javascript
// Step 1: Record audio from microphone
const recordAudio = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.start();

  // Record for 5 seconds (or until user stops)
  setTimeout(() => mediaRecorder.stop(), 5000);

  return new Promise((resolve) => {
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      resolve(audioBlob);
    };
  });
};

// Step 2: Send to backend
const convertToText = async (audioBlob) => {
  const response = await fetch('/api/public/stt?language=bn-IN', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: audioBlob,
  });

  const result = await response.json();
  return result;
};

// Step 3: Use it
const audioBlob = await recordAudio();
const { text, success, confidence } = await convertToText(audioBlob);

if (success) {
  console.log('Converted Text:', text);
  console.log('Confidence:', confidence);
} else {
  console.error('Error:', result.error);
}
```

### Method 2: React Component Example

```jsx
import { useState } from 'react';
import { Mic, Loader } from 'lucide-react';

export function AudioTranscriber() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  let mediaRecorder = null;
  let audioChunks = [];

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await sendAudioToBackend(audioBlob);
        setIsProcessing(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const sendAudioToBackend = async (audioBlob) => {
    try {
      setError('');
      const response = await fetch('/api/public/stt?language=bn-IN', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: audioBlob,
      });

      const result = await response.json();

      if (result.success) {
        setText(result.text);
      } else {
        setError(result.error || 'Failed to convert audio');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <h2 className="text-2xl font-bold">Speech to Text</h2>

      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white disabled:opacity-50`}
      >
        {isProcessing ? (
          <Loader className="animate-spin" />
        ) : (
          <Mic size={20} />
        )}
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>

      {text && (
        <div className="w-full max-w-md p-4 bg-green-100 rounded-lg">
          <p className="text-sm text-gray-600">Converted Text:</p>
          <p className="text-lg font-semibold">{text}</p>
        </div>
      )}

      {error && (
        <div className="w-full max-w-md p-4 bg-red-100 rounded-lg">
          <p className="text-sm text-red-600">Error: {error}</p>
        </div>
      )}
    </div>
  );
}
```

### Method 3: Mobile Application (React Native / Flutter)

#### React Native Example:
```javascript
import { Audio } from 'expo-av';

const recordAndConvert = async () => {
  try {
    // Request permission
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) return;

    // Start recording
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    await recording.startAsync();

    // Record for 5 seconds
    setTimeout(async () => {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      // Convert to base64
      const audioData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Send to backend
      const response = await fetch(
        'https://yourwebsite.com/api/public/stt?language=bn-IN',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          body: Buffer.from(audioData, 'base64'),
        }
      );

      const result = await response.json();
      console.log('Converted Text:', result.text);
    }, 5000);
  } catch (error) {
    console.error('Recording error:', error);
  }
};
```

---

## Endpoint Details

### POST /api/public/stt

**Request:**
```
Method: POST
URL: /api/public/stt?language=bn-IN&format=webm
Headers:
  Content-Type: application/octet-stream
Body: Binary audio data (Blob/ArrayBuffer)
```

**Query Parameters:**
| Parameter | Required | Values | Default |
|-----------|----------|--------|----------|
| language | No | en-US, bn-IN, fr-FR, etc. | en-US |
| format | No | wav, mp3, webm, ogg | webm |

**Response (Success):**
```json
{
  "success": true,
  "text": "আমার কথা বাংলায়",
  "language": "bn-IN",
  "confidence": 0.95
}
```

**Response (Error):**
```json
{
  "success": false,
  "text": "",
  "error": "No audio data provided"
}
```

---

## Supported Languages

### Google Cloud Speech-to-Text
- Bengali (bn-IN, bn-BD)
- English (en-US, en-GB, en-IN)
- Hindi (hi-IN)
- French (fr-FR)
- Spanish (es-ES)
- Arabic (ar-SA)
- Chinese (zh-CN, zh-TW)
- And 110+ more...

### Deepgram
- 99+ languages supported
- Real-time processing
- Better for streaming audio

---

## Best Practices

### 1. Audio Format
```javascript
// Use WebM format - best browser support
const mediaRecorder = new MediaRecorder(stream, {
  mimeType: 'audio/webm',
  audioBitsPerSecond: 128000,
});
```

### 2. Handle Errors
```javascript
const response = await fetch('/api/public/stt?language=bn-IN', {
  method: 'POST',
  body: audioBlob,
});

const result = await response.json();

if (!result.success) {
  // Handle error
  console.error('STT Error:', result.error);
  // Retry or show user-friendly message
}
```

### 3. Show User Feedback
```javascript
// Show recording status
const [status, setStatus] = useState('idle'); // idle, recording, processing

// idle: Show start button
// recording: Show stop button + timer
// processing: Show spinner + "Converting..."
```

### 4. Optimize Audio
```javascript
// Trim silence
// Compress audio before sending
// Use appropriate sample rate (16000Hz is standard)

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext({ sampleRate: 16000 });
```

---

## Troubleshooting

### Issue: 403 Unauthorized
**Solution:** Check if API key is valid and has proper permissions

### Issue: Audio quality is poor
**Solution:**
- Increase audio bitrate: `audioBitsPerSecond: 256000`
- Use higher sample rate
- Test with different microphone

### Issue: Slow response time
**Solution:**
- Use Deepgram instead of Google (faster processing)
- Optimize audio size (trim silence)
- Use streaming API for real-time

### Issue: CORS errors
**Solution:** Backend already has CORS headers, ensure request is from allowed origin

---

## Performance Optimization

### Real-time Streaming (Advanced)
```javascript
const socket = new WebSocket('wss://api.deepgram.com/v1/listen');

socket.send(audioData);

socket.onmessage = (event) => {
  const result = JSON.parse(event.data);
  console.log('Live transcript:', result.transcript);
};
```

### Batch Processing
```javascript
// Process multiple audio files
const audioFiles = [file1, file2, file3];
const results = await Promise.all(
  audioFiles.map(file => sendToSTT(file))
);
```

---

## Support & Additional Resources

- **Google Cloud Speech-to-Text:** https://cloud.google.com/speech-to-text/docs
- **Deepgram Documentation:** https://developers.deepgram.com/
- **Web Audio API:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- **MediaRecorder API:** https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder

---

## Next Steps

1. ✅ Choose STT service (Google or Deepgram)
2. ✅ Add API key to `.env`
3. ✅ Deploy backend
4. ✅ Implement client-side recording
5. ✅ Call `/api/public/stt` endpoint
6. ✅ Display results to user
