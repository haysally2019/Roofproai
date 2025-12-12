import { AgentConfig } from '../types';

const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io/v1/convai/agents';

export const createVoiceAgent = async (
  name: string, 
  firstMessage: string, 
  systemPrompt: string
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
            // Default to a standard expressive voice (can be configured later)
            voice_id: "21m00Tcm4TlvDq8ikWAM" 
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
    console.error("ElevenLabs API Error:", error);
    return { agentId: '', error: 'Network error connecting to ElevenLabs' };
  }
};