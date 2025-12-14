import { GoogleGenAI, Type, Modality } from "@google/genai";
import { AnalysisResult, WordDefinition, PronunciationScore } from "../types";

// Helper to get Gemini Client lazily
// Configured to use the local proxy (/google-api) which is forwarded by Netlify/Vite to Google
const getGenAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please check your Netlify Environment Variables.");
  }
  
  // Use current origin + /google-api as the base URL to route through our proxy
  // This is CRITICAL for access in China
  const proxyUrl = `${window.location.origin}/google-api`;
  
  return new GoogleGenAI({ 
    apiKey: apiKey,
    baseUrl: proxyUrl
  } as any);
};

// Singleton Audio Context for playback
let sharedAudioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!sharedAudioContext) {
    sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return sharedAudioContext;
};

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/mp3;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to decode Base64 to Uint8Array
const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// --- DeepSeek Helper ---
const callDeepSeek = async <T>(systemPrompt: string, userPrompt: string): Promise<T> => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DeepSeek API Key not configured.");

    try {
        const response = await fetch("/deepseek-api/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" },
                temperature: 1.3 
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`DeepSeek API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        return JSON.parse(content) as T;
    } catch (error) {
        console.error("DeepSeek Call Failed:", error);
        throw error;
    }
};

// 1. Analyze Audio: Transcribe, Translate, Rewrite, Metadata
export const analyzeAudio = async (file: File): Promise<AnalysisResult> => {
  const base64Audio = await fileToGenerativePart(file);
  
  const prompt = `
    Analyze this audio file for an English learner. 
    1. Transcribe the audio accurately. Break it down into logical sentence-level segments.
    2. For each segment, provide:
       - The original English text.
       - A translation into Simplified Chinese.
       - A "Native Rewrite": Rewrite the sentence to sound like a sophisticated native American English speaker (more idiomatic, natural flow).
       - A reason for the rewrite (brief explanation in Simplified Chinese, keeping referenced English terms in English).
       - An estimated start and end time in seconds (relative to the audio start).
    3. Analyze the overall difficulty (CEFR level: A1-C2).
    4. Estimate words per minute (WPM).
    
    Return pure JSON matching the schema.
  `;

  try {
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: file.type, data: base64Audio } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              metadata: {
                type: Type.OBJECT,
                properties: {
                  cefr: { type: Type.STRING },
                  wpm: { type: Type.NUMBER },
                  wordCount: { type: Type.NUMBER },
                  duration: { type: Type.NUMBER },
                }
              },
              segments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.NUMBER },
                    start: { type: Type.NUMBER },
                    end: { type: Type.NUMBER },
                    text: { type: Type.STRING },
                    translation: { type: Type.STRING },
                    nativeRewrite: { type: Type.STRING },
                    rewriteReason: { type: Type.STRING },
                  }
                }
              }
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as AnalysisResult;
      }
      throw new Error("Empty response from Gemini");

  } catch (error) {
      console.error("Gemini Analyze Error:", error);
      // NOTE: DeepSeek cannot replace this part because it does not support Audio files.
      // We throw a descriptive error.
      if (process.env.DEEPSEEK_API_KEY) {
          throw new Error("Gemini Connection Failed. Note: DeepSeek API is available but cannot process Audio files directly. Please ensure you can access Google services for the initial file analysis.");
      }
      throw new Error("Failed to analyze audio. Please check your network connection or API Key.");
  }
};

// 2. Define Word
export const defineWord = async (word: string, contextSentence: string): Promise<WordDefinition> => {
  const prompt = `Define the word "${word}" in the context of this sentence: "${contextSentence}". Return JSON.`;
  
  try {
      // Try Gemini via Proxy first
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              phonetic: { type: Type.STRING },
              definition: { type: Type.STRING },
              example: { type: Type.STRING },
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as WordDefinition;
      }
      throw new Error("Gemini returned empty text");

  } catch (error) {
      console.warn("Gemini defineWord failed, attempting DeepSeek fallback...", error);
      
      // FALLBACK: Use DeepSeek for text definitions (DeepSeek is native to China, works well without proxy if key is valid)
      if (process.env.DEEPSEEK_API_KEY) {
          const deepSeekSystemPrompt = `
            You are a helpful English dictionary assistant for learners.
            Return ONLY valid JSON matching this structure:
            {
              "word": "string (the word being defined)",
              "phonetic": "string (IPA)",
              "definition": "string (short clear definition in English)",
              "example": "string (a new example sentence using the word)"
            }
          `;
          try {
             return await callDeepSeek<WordDefinition>(deepSeekSystemPrompt, prompt);
          } catch (dsError) {
             throw new Error("Both Gemini and DeepSeek failed to define word.");
          }
      }
      
      throw new Error("Failed to define word");
  }
};

// 3. Score Pronunciation (Shadowing)
export const scorePronunciation = async (targetText: string, userAudioBlob: Blob): Promise<PronunciationScore> => {
  // Convert Blob to Base64
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(userAudioBlob);
  });
  const base64Audio = await base64Promise;

  const prompt = `
    The user is trying to say: "${targetText}".
    Listen to the audio and score their pronunciation, intonation, and rhythm from 0 to 100.
    Provide a rating (Good, Average, Poor) and constructive feedback on how to sound more native.
  `;

  try {
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType: 'audio/wav', data: base64Audio } }, 
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              rating: { type: Type.STRING, enum: ['Good', 'Average', 'Poor'] },
              feedback: { type: Type.STRING },
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as PronunciationScore;
      }
      throw new Error("Gemini scoring failed");
  } catch (error) {
       throw new Error("Pronunciation scoring requires Gemini API (Audio processing).");
  }
};

// 4. TTS for Native Rewrite
export const generateSpeech = async (text: string): Promise<Uint8Array> => {
  try {
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: {
          parts: [{ text: text }]
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' } // 'Kore', 'Puck', 'Fenrir', 'Charon'
            }
          }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio generated");

      return base64ToUint8Array(base64Audio);
  } catch (error) {
      console.error("TTS Generation failed:", error);
      throw new Error("Speech generation unavailable.");
  }
};

// 5. Play PCM Audio (Manual Decoding)
export const playPCM = (pcmData: Uint8Array, onEnded?: () => void) => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  
  const sampleRate = 24000;
  const numChannels = 1;
  
  const dataInt16 = new Int16Array(pcmData.buffer);
  const frameCount = dataInt16.length / numChannels;
  
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
  
  source.onended = () => {
    if (onEnded) onEnded();
  };
  
  return source;
};
