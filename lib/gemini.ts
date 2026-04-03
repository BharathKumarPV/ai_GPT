import { MODELS } from './models';
import { GoogleGenAI } from '@google/genai';

export { MODELS } from './models';

export interface ChatResponseChunk {
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  groundingUrls?: string[];
}

export async function* streamChat(
  modelId: string,
  history: { role: 'user' | 'model'; text: string }[],
  message: string,
  attachment?: { data: string, mimeType: string },
  guardrailsEnabled: boolean = false
): AsyncGenerator<ChatResponseChunk, void, unknown> {
  const model = MODELS.find(m => m.id === modelId);
  const systemInstruction = 'You are a helpful, secure, and professional AI assistant for BK.';

  if (!model) throw new Error('Model not found');

  if (guardrailsEnabled && message) {
    try {
      const preRes = await fetch('/api/guardrail/pre', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Try to get user ID from Firebase auth if available
          'x-user-id': typeof window !== 'undefined' ? (window as any).firebaseUserId || 'anonymous' : 'anonymous'
        },
        body: JSON.stringify({ input: message })
      });
      if (preRes.ok) {
        const preData = await preRes.json();
        if (!preData.isSafe) {
          yield { text: `[Guardrail Alert] Your message was blocked: ${preData.reason || 'Potential prompt injection detected.'}` };
          return;
        }
      }
    } catch (e) {
      console.error('Pre-processing guardrail failed:', e);
    }
  }

  if (['gemini-3.1-flash-image-preview', 'veo-3.1-fast-generate-preview', 'lyria-3-clip-preview', 'gemini-2.5-flash-preview-tts'].includes(modelId)) {
    const { streamSpecialModels } = await import('./specialModels');
    yield* streamSpecialModels(modelId, history, message, attachment);
    return;
  }

  let fullResponse = '';

  const messages = [
    ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
    { 
      role: 'user', 
      content: attachment 
        ? [
            { type: 'text', text: message },
            { type: 'media_url', media_url: { url: `data:${attachment.mimeType};base64,${attachment.data}` } }
          ]
        : message 
    }
  ];
  
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-user-id': typeof window !== 'undefined' ? (window as any).firebaseUserId || 'anonymous' : 'anonymous'
    },
    body: JSON.stringify({ 
      model: modelId, 
      provider: model.provider,
      messages,
      system: systemInstruction
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'API error');
  }
  if (!response.body) throw new Error('No response body');
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text || parsed.groundingUrls) {
            if (parsed.text) fullResponse += parsed.text;
            yield { text: parsed.text, groundingUrls: parsed.groundingUrls };
          }
        } catch (e: any) {
          if (e.message && e.message !== 'Unexpected end of JSON input') {
            throw e;
          }
        }
      }
    }
  }

  if (guardrailsEnabled && fullResponse) {
    try {
      const postRes = await fetch('/api/guardrail/post', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': typeof window !== 'undefined' ? (window as any).firebaseUserId || 'anonymous' : 'anonymous'
        },
        body: JSON.stringify({ output: fullResponse, systemPrompt: systemInstruction })
      });
      if (postRes.ok) {
        const postData = await postRes.json();
        if (!postData.isSafe) {
          yield { text: `\n\n[Guardrail Alert] The generated response was flagged for: ${postData.reason || 'Harmful content or deviation from rules.'}` };
        }
      }
    } catch (e) {
      console.error('Post-processing guardrail failed:', e);
    }
  }
}
