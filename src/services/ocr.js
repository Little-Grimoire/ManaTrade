// No app nativo (Expo Go) o Tesseract.js não roda: a identificação usa a LLM via backend (/scan).
export async function ocrCandidateLines() { return []; }
export const ocrAvailable = false;
