export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Aoede';

function getApiKeyHeader() {
  const apiKey = localStorage.getItem('gemini_api_key');
  return apiKey ? { 'x-gemini-api-key': apiKey } : {};
}

export async function transcribeAudio(fileBase64: string, mimeType: string, languageCode: string): Promise<string> {
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getApiKeyHeader() },
    body: JSON.stringify({ fileBase64, mimeType, languageCode })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to transcribe audio');
  }
  const data = await response.json();
  return data.result;
}

export async function enhanceTextForSpeech(text: string, languageCode: string): Promise<string> {
  const response = await fetch('/api/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getApiKeyHeader() },
    body: JSON.stringify({ text, languageCode })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to enhance text');
  }
  const data = await response.json();
  return data.result;
}

function splitTextIntoChunks(text: string, maxLength: number = 800): string[] {
  const chunks: string[] = [];
  let current = text;
  while (current.length > 0) {
    if (current.length <= maxLength) {
      chunks.push(current);
      break;
    }
    // Try to split by punctuation
    let lastPunc = current.substring(0, maxLength).lastIndexOf('.');
    if (lastPunc === -1) lastPunc = current.substring(0, maxLength).lastIndexOf(',');
    if (lastPunc === -1) lastPunc = current.substring(0, maxLength).lastIndexOf('\n');
    if (lastPunc === -1) lastPunc = current.substring(0, maxLength).lastIndexOf(' ');

    if (lastPunc === -1 || lastPunc === 0) {
       chunks.push(current.substring(0, maxLength));
       current = current.substring(maxLength);
    } else {
       chunks.push(current.substring(0, lastPunc + 1));
       current = current.substring(lastPunc + 1).trim();
    }
  }
  return chunks;
}

export async function generateSpeech(text: string, voiceName: VoiceName): Promise<string[] | null> {
  const chunks = splitTextIntoChunks(text, 600);
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getApiKeyHeader() },
    body: JSON.stringify({ chunks, voiceName })
  });
  
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to generate speech');
  }
  
  const data = await response.json();
  if (data.audioChunks && data.audioChunks.length > 0) {
    return data.audioChunks;
  }
  return null;
}

