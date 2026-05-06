export function pcmBase64ToWavUrl(base64: string | string[], sampleRate: number = 24000): string {
  const base64Array = Array.isArray(base64) ? base64 : [base64];
  
  let totalPcmLength = 0;
  const binaryStrings = base64Array.map(b => {
    const bin = atob(b);
    totalPcmLength += bin.length;
    return bin;
  });

  const wavBuffer = new ArrayBuffer(44 + totalPcmLength);
  const view = new DataView(wavBuffer);

  const writeString = (v: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      v.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + totalPcmLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, totalPcmLength, true);

  // Write PCM data
  const pcmBytes = new Uint8Array(wavBuffer, 44);
  let byteOffset = 0;
  for (const binStr of binaryStrings) {
    for (let i = 0; i < binStr.length; i++) {
      pcmBytes[byteOffset++] = binStr.charCodeAt(i);
    }
  }

  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}
