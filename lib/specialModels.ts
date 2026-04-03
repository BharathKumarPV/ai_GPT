import { GoogleGenAI } from '@google/genai';
import { ChatResponseChunk } from './gemini';

export async function* streamSpecialModels(
  modelId: string,
  history: { role: 'user' | 'model'; text: string }[],
  message: string,
  attachment?: { data: string, mimeType: string }
): AsyncGenerator<ChatResponseChunk, void, unknown> {
  const isPaidModel = ['gemini-3.1-flash-image-preview', 'veo-3.1-fast-generate-preview', 'lyria-3-clip-preview'].includes(modelId);
  
  if (isPaidModel) {
    if (!(window as any).aistudio?.hasSelectedApiKey?.()) {
      if ((window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
      } else {
        throw new Error("Please select an API key to use this model.");
      }
    }
  }

  const apiKey = isPaidModel ? process.env.API_KEY : process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(isPaidModel ? "API_KEY is not set. Please select a paid API key." : "GEMINI_API_KEY is not set.");
  }
  const ai = new GoogleGenAI({ apiKey });

  if (modelId === 'gemini-3.1-flash-image-preview') {
    const parts: any[] = [{ text: message || 'Generate an image based on the prompt.' }];
    if (attachment) {
      parts.push({ inlineData: { data: attachment.data, mimeType: attachment.mimeType } });
    }
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        yield { mediaUrl: imageUrl, mediaType: 'image' };
      } else if (part.text) {
        yield { text: part.text };
      }
    }
    return;
  }

  if (modelId === 'veo-3.1-fast-generate-preview') {
    yield { text: "Generating video... This may take a few minutes." };
    let operation = await ai.models.generateVideos({
      model: modelId,
      prompt: message || 'Generate a video based on the image.',
      ...(attachment && attachment.mimeType.startsWith('image/') ? {
        image: {
          imageBytes: attachment.data,
          mimeType: attachment.mimeType
        }
      } : {}),
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
      yield { mediaUrl: downloadLink, mediaType: 'video' };
    } else {
      yield { text: "Failed to generate video." };
    }
    return;
  }

  if (modelId === 'lyria-3-clip-preview') {
    const parts: any[] = [{ text: message || 'Generate a music clip.' }];
    if (attachment && attachment.mimeType.startsWith('image/')) {
      parts.push({ inlineData: { data: attachment.data, mimeType: attachment.mimeType } });
    }
    const response = await ai.models.generateContentStream({
      model: modelId,
      contents: { parts },
    });

    let audioBase64 = "";
    let mimeType = "audio/wav";

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (!audioBase64 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioBase64 += part.inlineData.data;
        }
        if (part.text) {
          yield { text: part.text };
        }
      }
    }

    if (audioBase64) {
      const audioUrl = `data:${mimeType};base64,${audioBase64}`;
      yield { mediaUrl: audioUrl, mediaType: 'audio' };
    }
    return;
  }

  if (modelId === 'gemini-2.5-flash-preview-tts') {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ parts: [{ text: message }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioUrl = `data:audio/wav;base64,${base64Audio}`;
      yield { mediaUrl: audioUrl, mediaType: 'audio' };
    } else {
      yield { text: "Failed to generate audio." };
    }
    return;
  }
}
