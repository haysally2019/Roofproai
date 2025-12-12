import { AgentConfig } from '../types';

const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io/v1/convai/agents';
const VOICES_URL = 'https://api.elevenlabs.io/v1/voices';

/**
 * Creates a new conversational agent on ElevenLabs
 */
export const createVoiceAgent = async (
  name: string, 
  firstMessage: string, 
  systemPrompt: string,
  voiceId?: string
): Promise<{ agentId: string; error?: string }> => {
  
  if (!API_KEY) {
    return { agentId: '', error: 'Missing VITE_ELEVENLABS_API_KEY in .env file' };
  }

  try {
    const response = await fetch(`${BASE_URL}/create`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name,
        conversation_config: {
          agent: {
            prompt: {
              prompt: systemPrompt
            },
            first_message: firstMessage,
            language: "en" 
          },
          tts: {
            voice_id: voiceId || "21m00Tcm4TlvDq8ikWAM" // Default Rachel if none selected
          }
        }
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return { agentId: '', error: err.detail?.message || 'Failed to create agent' };
    }

    const data = await response.json();
    return { agentId: data.agent_id };

  } catch (error) {
    console.error("ElevenLabs Create Error:", error);
    return { agentId: '', error: 'Network error connecting to ElevenLabs' };
  }
};

/**
 * Updates an existing agent's configuration (Voice, Prompt, First Message)
 */
export const updateVoiceAgent = async (
  agentId: string,
  config: {
    firstMessage?: string;
    systemPrompt?: string;
    voiceId?: string;
  }
): Promise<{ success: boolean; error?: string }> => {

  if (!API_KEY) return { success: false, error: 'Missing API Key' };

  try {
    // Construct patch object with correct nesting
    const patchData: any = {
      conversation_config: {
        agent: {},
        tts: {}
      }
    };

    if (config.firstMessage) patchData.conversation_config.agent.first_message = config.firstMessage;
    if (config.systemPrompt) patchData.conversation_config.agent.prompt = { prompt: config.systemPrompt };
    if (config.voiceId) patchData.conversation_config.tts.voice_id = config.voiceId;

    const response = await fetch(`${BASE_URL}/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patchData),
    });

    if (!response.ok) {
      const err = await response.json();
      return { success: false, error: err.detail?.message || 'Failed to update agent' };
    }

    return { success: true };

  } catch (error) {
    console.error("ElevenLabs Update Error:", error);
    return { success: false, error: 'Network error updating agent' };
  }
};

/**
 * Fetches available voices to let users choose "Tone"
 */
export const getAvailableVoices = async (): Promise<{id: string, name: string, category: string}[]> => {
  if (!API_KEY) return [];

  try {
    const response = await fetch(VOICES_URL, {
      method: 'GET',
      headers: { 'xi-api-key': API_KEY }
    });

    if (!response.ok) return [];

    const data = await response.json();
    // Return voices, mapping them to a simple structure
    return data.voices.map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      category: v.category || 'generated'
    })).slice(0, 15); // Top 15 to keep list manageable

  } catch (error) {
    console.error("Voice Fetch Error:", error);
    return [];
  }
};