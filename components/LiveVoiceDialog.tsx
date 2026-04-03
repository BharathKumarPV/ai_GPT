import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { toast } from 'sonner';

interface LiveVoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LiveVoiceDialog({ isOpen, onClose }: LiveVoiceDialogProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      stopRecording();
    }
  }, [isOpen]);

  const startRecording = async () => {
    try {
      setIsConnecting(true);
      setTranscript([]);
      
      if (typeof window !== 'undefined' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await (window as any).aistudio.openSelectKey();
        }
      }

      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        toast.error('API Key is missing');
        setIsConnecting(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      } });
      mediaStreamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      const sessionPromise = ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
             setIsConnecting(false);
             setIsRecording(true);
             processor.onaudioprocess = (e) => {
               const inputData = e.inputBuffer.getChannelData(0);
               // Convert Float32Array to Int16Array
               const pcmData = new Int16Array(inputData.length);
               for (let i = 0; i < inputData.length; i++) {
                 pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
               }
               // Convert Int16Array to base64
               const buffer = new ArrayBuffer(pcmData.length * 2);
               const view = new DataView(buffer);
               for (let i = 0; i < pcmData.length; i++) {
                 view.setInt16(i * 2, pcmData[i], true);
               }
               const base64Data = btoa(String.fromCharCode(...new Uint8Array(buffer)));
               
               sessionPromise.then((session) => {
                 session.sendRealtimeInput({
                   audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                 });
               });
             };
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const int16Array = new Int16Array(bytes.buffer);
              const float32Array = new Float32Array(int16Array.length);
              for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
              }
              audioQueueRef.current.push(float32Array);
              playNextAudio();
            }
            
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              isPlayingRef.current = false;
            }
          },
          onerror: (error) => {
            console.error('Live API Error:', error);
            toast.error('Live API connection error');
            stopRecording();
          },
          onclose: () => {
            stopRecording();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are a helpful, conversational AI assistant.",
        },
      });
      
      sessionRef.current = sessionPromise;

    } catch (error) {
      console.error('Error starting voice chat:', error);
      toast.error('Failed to start voice chat');
      setIsConnecting(false);
      stopRecording();
    }
  };

  const playNextAudio = () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) return;
    
    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift()!;
    
    const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
    audioBuffer.getChannelData(0).set(audioData);
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => {
      isPlayingRef.current = false;
      playNextAudio();
    };
    source.start();
  };

  const stopRecording = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => {
        if (session && typeof session.close === 'function') {
          session.close();
        }
      });
      sessionRef.current = null;
    }
    setIsRecording(false);
    setIsConnecting(false);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle>Live Voice Chat</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8 gap-6">
          <div className="relative">
            <div className={`absolute inset-0 rounded-full ${isRecording ? 'bg-primary/20 animate-ping' : ''}`} />
            <Button
              size="icon"
              variant={isRecording ? "destructive" : "default"}
              className="w-24 h-24 rounded-full relative z-10"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="w-10 h-10 animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-10 h-10" />
              ) : (
                <Mic className="w-10 h-10" />
              )}
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {isConnecting ? "Connecting to AI..." : 
             isRecording ? "Listening... Speak now." : 
             "Click the microphone to start talking"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
