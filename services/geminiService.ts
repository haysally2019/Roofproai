import { GoogleGenAI, Type } from "@google/genai";
import { EstimateItem, RoofType, GroundingResult, LogicArgument, RoofMeasurement } from '../types';

// Access Vite environment variable correctly
const apiKey = import.meta.env.VITE_GOOGLE_GENAI_KEY || '';

// Add a safety check so the app doesn't crash on load
if (!apiKey) {
  console.warn("Gemini API Key is missing. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey });

/**
 * Uses Gemini Flash Lite for ultra-fast chat responses.
 */
export const getChatResponse = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
  if (!apiKey) return "AI Configuration Error: API Key missing.";
  
  try {
    const model = 'gemini-2.0-flash-lite-preview-02-05';
    
    const chat = ai.chats.create({
      model: model,
      history: history,
      config: {
        systemInstruction: "You are RAFTER AI, an AI assistant for a roofing insurance restoration CRM. You help users with claims, Xactimate questions, supplements, and roofing materials. Keep responses short and professional.",
      }
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Chat Error:", error);
    return "I'm having trouble connecting. Please check your internet or API limits.";
  }
};

/**
 * Uses Gemini Flash for structured JSON estimation generation.
 */
export const generateSmartEstimate = async (
  roofType: RoofType, 
  sqFt: number, 
  difficulty: string,
  notes: string
): Promise<EstimateItem[]> => {
  if (!apiKey) return [];

  try {
    const prompt = `Generate a detailed roofing estimate line item list for a ${sqFt} sq ft ${roofType} roof. Difficulty: ${difficulty}. Additional notes: ${notes}. Include labor, materials, waste, and permits.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              unitPrice: { type: Type.NUMBER },
              total: { type: Type.NUMBER }
            },
            required: ['description', 'quantity', 'unit', 'unitPrice', 'total']
          }
        }
      }
    });

    if (response.text) {
      // PATCH: Strip markdown code blocks if present to prevent JSON parse errors
      const cleanJson = response.text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanJson) as EstimateItem[];
    }
    return [];
  } catch (error) {
    console.error("Estimate Error:", error);
    return [];
  }
};

/**
 * Uses Gemini Flash Vision to analyze roof images for damage.
 */
export const analyzeRoofImage = async (base64Image: string): Promise<string> => {
  if (!apiKey) return "API Key missing.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Analyze this roof image for storm damage (hail, wind). Identify if this damage is likely to be approved by insurance. Estimate roof age and severity." }
        ]
      }
    });
    
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Vision Error:", error);
    return "Could not analyze the image. Please try a clearer photo.";
  }
};

/**
 * Uses Gemini Flash Lite to draft a professional email.
 */
export const draftClientEmail = async (clientName: string, topic: string, tone: 'professional' | 'friendly' | 'urgent'): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite-preview-02-05', 
      contents: `Draft a short, ${tone} email to client ${clientName} about: ${topic}. Focus on the insurance claim process. Sign it as 'The RAFTER AI Team'.`,
    });
    return response.text || "";
  } catch (error) {
    return "Error drafting email.";
  }
};

/**
 * Uses Gemini Flash to analyze business stats and provide actionable advice.
 */
export const generateBusinessInsights = async (stats: any): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are a restoration business analyst. Stats: ${JSON.stringify(stats)}. 
      Identify 1 key positive trend in the claims pipeline and 1 bottleneck (e.g. supplements, approvals). 
      Keep it brief.`,
    });
    return response.text || "Pipeline looks steady. Focus on moving claims from filed to approved.";
  } catch (error) {
    return "Unable to generate insights at this moment.";
  }
};

/**
 * Suggests a list of tasks for a lead based on their status.
 */
export const suggestTasksForLead = async (leadStatus: string, projectType: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite-preview-02-05',
      contents: `Generate a JSON array of 3-5 short actionable tasks for a roofing salesperson handling a ${projectType} lead in status: ${leadStatus}. Strings only.`,
      config: {
        responseMimeType: 'application/json',
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return ["Follow up with client", "Update CRM notes"];
  }
};

/**
 * Analyzes an Insurance Scope of Loss from text.
 */
export const analyzeScopeOfLoss = async (scopeText: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are an expert roofing insurance supplement specialist. Analyze this insurance scope of loss and identify:

1. Missing line items commonly overlooked (O&P, code upgrades, ice & water shield, ventilation, etc.)
2. Underpriced items that need adjustment
3. Missing scope items that should be included
4. Code compliance issues that require supplements

Provide a detailed analysis with:
- **Missing Items**: List specific items with explanations
- **Underpriced Items**: Items that appear below market rate
- **Recommended Actions**: What to request from the adjuster
- **Estimated Additional Value**: Rough estimate of supplement value

Scope of Loss:
${scopeText}`,
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Scope analysis error:", error);
    return "Failed to analyze document.";
  }
};

/**
 * Analyzes a scope of loss from an image file using Vision AI.
 */
export const analyzeScopeFromImage = async (base64Image: string, mimeType: string): Promise<string> => {
  if (!apiKey) return "API Key missing.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: `You are an expert roofing insurance supplement specialist. Extract and analyze the scope of loss from this document. Identify:

1. All line items currently included
2. Missing items commonly overlooked (O&P, code upgrades, ice & water shield, ventilation, etc.)
3. Underpriced items
4. Missing scope items that should be included
5. Code compliance issues

Provide:
- **Current Scope Summary**: What's included
- **Missing Items**: Detailed list with explanations
- **Underpriced Items**: Items below market rate
- **Recommended Supplements**: What to request
- **Estimated Additional Value**: Rough supplement value` }
        ]
      }
    });

    return response.text || "No analysis generated from image.";
  } catch (error) {
    console.error("Vision scope analysis error:", error);
    return "Could not analyze the document image. Please try a clearer photo or upload as text.";
  }
};

/**
 * Simulates Solar API roof measurement using Gemini estimation.
 */
export const getRoofDataFromAddress = async (address: string): Promise<RoofMeasurement> => {
    try {
        const response = await ai.models.generateContent({
             model: 'gemini-2.0-flash',
             contents: `Estimate the detailed roof geometry for a typical residential property at: ${address}. 
             Infer the likely size and style based on the address (e.g. city density, state).
             Return valid JSON only.
             Fields:
             - totalAreaSqFt (number): Total roof area
             - pitch (string): e.g. "6/12"
             - solarPotential (string): "High", "Medium", "Low"
             - segments (number): Number of facets
             - maxSunlightHours (number): Yearly hours
             - ridgeLen (number): Total linear feet of ridges
             - hipLen (number): Total linear feet of hips
             - valleyLen (number): Total linear feet of valleys
             - rakeLen (number): Total linear feet of rakes
             - eaveLen (number): Total linear feet of eaves`,
             config: {
                 responseMimeType: 'application/json',
                 responseSchema: {
                     type: Type.OBJECT,
                     properties: {
                         totalAreaSqFt: { type: Type.NUMBER },
                         pitch: { type: Type.STRING },
                         solarPotential: { type: Type.STRING },
                         segments: { type: Type.NUMBER },
                         maxSunlightHours: { type: Type.NUMBER },
                         ridgeLen: { type: Type.NUMBER },
                         hipLen: { type: Type.NUMBER },
                         valleyLen: { type: Type.NUMBER },
                         rakeLen: { type: Type.NUMBER },
                         eaveLen: { type: Type.NUMBER }
                     },
                     required: ['totalAreaSqFt', 'pitch', 'solarPotential', 'segments', 'maxSunlightHours', 'ridgeLen', 'hipLen', 'valleyLen', 'rakeLen', 'eaveLen']
                 }
             }
        });
        if(response.text) return JSON.parse(response.text);
        return { 
            totalAreaSqFt: 2800, pitch: '6/12', solarPotential: 'High', segments: 8, maxSunlightHours: 1400,
            ridgeLen: 60, hipLen: 40, valleyLen: 30, rakeLen: 80, eaveLen: 120
        };
    } catch (e) {
        return { 
            totalAreaSqFt: 2450, pitch: '7/12', solarPotential: 'Good', segments: 6, maxSunlightHours: 1250,
            ridgeLen: 45, hipLen: 30, valleyLen: 20, rakeLen: 70, eaveLen: 100
        };
    }
}

// --- NEW AI INFRASTRUCTURE FEATURES ---

/**
 * Market Watch: Uses Google Search Grounding to find live pricing or code info.
 */
export const searchMarketInfo = async (query: string): Promise<GroundingResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "No results found.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources = chunks
      .filter((c: any) => c.web?.uri && c.web?.title)
      .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

    return { text, sources };
  } catch (error) {
    console.error("Search Grounding Error:", error);
    return { text: "Unable to connect to Google Search at this time.", sources: [] };
  }
};

/**
 * Supplier Scout: Uses Google Maps Grounding to find locations.
 */
export const findLocalSuppliers = async (location: string): Promise<GroundingResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Find roofing supply distributors near ${location}.`,
      config: {
        tools: [{ googleMaps: {} }]
      }
    });

    const text = response.text || "No suppliers found.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const sources = chunks
      .filter((c: any) => c.web?.uri)
      .map((c: any) => ({ title: c.web?.title || 'Map Result', uri: c.web?.uri }));

    return { text, sources };
  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { text: "Unable to access Google Maps.", sources: [] };
  }
};

/**
 * Supplement Strategist: Uses Gemini 2.5 Thinking model for deep reasoning.
 */
export const generateSupplementArgument = async (denialReason: string, itemInQuestion: string): Promise<LogicArgument> => {
  try {
    const prompt = `You are an expert insurance supplement specialist. 
    The adjuster denied: "${itemInQuestion}".
    Their reason: "${denialReason}".
    
    Create a logical argument to overturn this denial based on construction standards and Xactimate logic.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-thinking-exp-01-21', 
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            point: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            action: { type: Type.STRING }
          },
          required: ['point', 'reasoning', 'action']
        }
      }
    });

    if (response.text) {
      const cleanJson = response.text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanJson) as LogicArgument;
    }
    throw new Error("Empty response");
  } catch (error) {
    console.error("Thinking Error:", error);
    return {
      point: "Error generating argument",
      reasoning: "The AI logic center is currently offline.",
      action: "Please draft manually."
    };
  }
};