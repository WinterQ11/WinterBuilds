import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

export async function generateAppEnhancements(params: {
  appName: string;
  packageName: string;
  category?: string;
  rawDescription?: string;
}): Promise<{
  shortDescription: string;
  description: string;
  suggestedCategory: string;
  features: string[];
}> {
  const ai = getGeminiClient();
  if (!ai) {
    // Intelligent fallback if Gemini key is not configured
    return {
      shortDescription: `${params.appName} for Android. Fast, clean, and secure APK build.`,
      description: params.rawDescription || `${params.appName} is a verified Android application packaged under ${params.packageName}. Install this build directly to your device for high performance and reliable features.`,
      suggestedCategory: params.category || 'Utilities',
      features: ['Verified package signature', 'Android optimized performance', 'Direct installation'],
    };
  }

  try {
    const prompt = `You are an Android app store specialist for WinterBuilds APK Hub.
Given an Android application:
- Name: "${params.appName}"
- Package: "${params.packageName}"
- Existing description / hints: "${params.rawDescription || 'None'}"
- Category: "${params.category || 'Utilities'}"

Please generate a compelling, professional, and clear app store entry in JSON format:
{
  "shortDescription": "A snappy one-sentence summary under 120 characters",
  "description": "A comprehensive 2-3 paragraph description explaining what the app does, key capabilities, and user benefits",
  "suggestedCategory": "One of: Games, Tools, Productivity, Education, Entertainment, Photography, Social, Utilities, Communication, Media & Video, Other",
  "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);

    return {
      shortDescription: parsed.shortDescription || `${params.appName} for Android.`,
      description: parsed.description || `${params.appName} is a verified Android application.`,
      suggestedCategory: parsed.suggestedCategory || params.category || 'Utilities',
      features: Array.isArray(parsed.features) ? parsed.features : [],
    };
  } catch (err) {
    console.warn('Gemini enhancement failed, falling back:', err);
    return {
      shortDescription: `${params.appName} for Android. Fast, clean, and secure APK build.`,
      description: params.rawDescription || `${params.appName} (${params.packageName}) ready for download on WinterBuilds.`,
      suggestedCategory: params.category || 'Utilities',
      features: ['Verified package integrity', 'Android optimized'],
    };
  }
}
