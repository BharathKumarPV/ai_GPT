import { useState, useRef, useEffect } from 'react';
import { Message, Chat } from '@/lib/firestore';
import { MessageBubble } from './MessageBubble';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SendHorizontal, Loader2, Menu, PanelLeftOpen, Paperclip, X, Mic, Download, RefreshCw, AudioLines, Lightbulb, Copy } from 'lucide-react';
import { ModelSelector } from './ModelSelector';
import { Sidebar } from './Sidebar';
import { LiveVoiceDialog } from './LiveVoiceDialog';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { User } from 'firebase/auth';

interface ChatAreaProps {
  user: User;
  messages: Message[];
  isGenerating: boolean;
  onSendMessage: (text: string, attachment?: { data: string, mimeType: string }) => void;
  onRegenerate: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onUpdateChatTitle: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  isSidebarOpen?: boolean;
  toggleSidebar?: () => void;
}

import { PROMPT_TEMPLATES } from '@/src/config/templates';

export function ChatArea({
  user,
  messages,
  isGenerating,
  onSendMessage,
  onRegenerate,
  selectedModel,
  onSelectModel,
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onUpdateChatTitle,
  onOpenSettings,
  isSidebarOpen = true,
  toggleSidebar,
}: ChatAreaProps) {
  const [input, setInput] = useState('');
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'txt' | 'pdf' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{ data: string, mimeType: string, name: string } | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsDictating(false);
      };

      recognitionRef.current.onend = () => {
        setIsDictating(false);
      };
    }
  }, []);

  const toggleDictation = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsDictating(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isBottom = Math.abs(target.scrollHeight - target.clientHeight - target.scrollTop) < 50;
    setIsAtBottom(isBottom);
  };

  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (isNewMessage) {
      setIsAtBottom(true);
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [messages, isAtBottom]);

  const handleSend = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && !attachment) return;
    if (isGenerating) return;

    // Basic format checks: prevent sending only special characters if it's not meaningful
    // We use \p{L} for letters and \p{N} for numbers in any language
    if (trimmedInput && !/[\p{L}\p{N}]/u.test(trimmedInput) && !attachment) {
      toast.error('Message must contain at least one letter or number.');
      return;
    }

    onSendMessage(trimmedInput, attachment ? { data: attachment.data, mimeType: attachment.mimeType } : undefined);
    setInput('');
    setAttachment(null);
    setIsAtBottom(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setAttachment({
          data: base64String,
          mimeType: file.type,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copyChatToClipboard = () => {
    if (messages.length === 0) {
      toast.error('No messages to copy.');
      return;
    }
    let textContent = 'Chat History - BK Ltd 2026\n\n';
    messages.forEach((msg) => {
      const role = msg.role === 'user' ? 'You' : 'AI';
      textContent += `[${role}]: ${msg.text}\n\n`;
    });
    navigator.clipboard.writeText(textContent).then(() => {
      toast.success('Chat copied to clipboard');
    }).catch((err) => {
      console.error('Failed to copy chat: ', err);
      toast.error('Failed to copy chat');
    });
  };

  const exportToTxt = () => {
    if (messages.length === 0) {
      toast.error('No messages to export.');
      return;
    }
    let textContent = 'Chat History - BK Ltd 2026\n\n';
    messages.forEach((msg) => {
      const role = msg.role === 'user' ? 'You' : 'AI';
      textContent += `[${role}]: ${msg.text}\n\n`;
    });
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Chat exported as TXT');
  };

  const exportToPdf = () => {
    if (messages.length === 0) {
      toast.error('No messages to export.');
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Chat History', 14, 20);
    doc.setFontSize(10);
    doc.text('BK Ltd 2026', 14, 28);
    
    const tableData = messages.map(msg => [
      msg.role === 'user' ? 'You' : 'AI',
      msg.text
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['Role', 'Message']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 20 } }
    });

    doc.save(`chat-export-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Chat exported as PDF');
  };

  const handleModify = (instruction: string) => {
    onSendMessage(`Rewrite the previous response to be ${instruction.toLowerCase()}.`);
  };

  const SUGGESTED_PROMPTS = [
    "Draft an email to my team",
    "Explain quantum computing",
    "Help me plan a trip",
    "Write a python script"
  ];

  const inputBox = (
    <div className="w-full relative group">
      <div className="absolute -inset-[2px] ai-glow-bg rounded-3xl opacity-60 group-focus-within:opacity-100 blur-[8px] transition-opacity duration-500"></div>
      <div className="absolute -inset-[1px] ai-glow-bg rounded-3xl opacity-100"></div>
      <div className="relative flex flex-col bg-[#1e1f20] rounded-3xl p-1.5 sm:p-2 shadow-sm">
        {attachment && (
        <div className="flex items-center gap-2 p-2 mb-2 bg-background rounded-md border border-border w-fit max-w-[90%] sm:max-w-full relative group">
          {attachment.mimeType.startsWith('image/') ? (
            <img src={`data:${attachment.mimeType};base64,${attachment.data}`} alt={attachment.name} className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded" />
          ) : attachment.mimeType.startsWith('video/') ? (
            <video src={`data:${attachment.mimeType};base64,${attachment.data}`} className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded" />
          ) : attachment.mimeType.startsWith('audio/') ? (
            <audio src={`data:${attachment.mimeType};base64,${attachment.data}`} controls className="h-8 w-40 sm:w-48" />
          ) : null}
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[150px]">{attachment.name}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 absolute -top-2 -right-2 bg-background border rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setAttachment(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="flex items-end gap-1 sm:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="shrink-0 rounded-full mb-1 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground" title="Prompt Templates" />}>
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {PROMPT_TEMPLATES.map((template, idx) => (
              <DropdownMenuItem key={idx} onClick={() => setInput(template.text)}>
                {template.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*"
        />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full mb-1 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={`shrink-0 rounded-full mb-1 h-8 w-8 sm:h-10 sm:w-10 ${isDictating ? 'text-primary bg-primary/10 animate-pulse' : 'text-muted-foreground hover:text-foreground'}`}
          onClick={toggleDictation}
          title={isDictating ? "Stop dictation" : "Dictate message"}
        >
          <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-full mb-1 h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground hover:text-foreground"
          onClick={() => setIsLiveVoiceOpen(true)}
          title="Live Voice Chat"
        >
          <AudioLines className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question let AI do the rest"
          className="min-h-[40px] sm:min-h-[44px] max-h-32 resize-none border-0 focus-visible:ring-0 bg-transparent py-2.5 sm:py-3 text-sm sm:text-base placeholder:text-gray-400 placeholder:text-left placeholder:align-top"
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={(!input.trim() && !attachment) || isGenerating}
          className="shrink-0 rounded-full mb-1 h-8 w-8 sm:h-10 sm:w-10"
        >
          <SendHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full bg-background relative">
      <header className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b border-border bg-background/80 backdrop-blur-sm z-10 sticky top-0">
        <div className="flex items-center gap-1 sm:gap-2">
          {!isSidebarOpen && toggleSidebar && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hidden md:flex h-9 w-9 text-muted-foreground hover:text-foreground mr-1">
              <PanelLeftOpen className="h-5 w-5" />
            </Button>
          )}
          <Sidebar
            user={user}
            chats={chats}
            currentChatId={currentChatId}
            onSelectChat={onSelectChat}
            onNewChat={onNewChat}
            onDeleteChat={onDeleteChat}
            onUpdateChatTitle={onUpdateChatTitle}
            onOpenSettings={onOpenSettings}
            isMobile={true}
          />
          <ModelSelector selectedModel={selectedModel} onSelectModel={onSelectModel} />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={copyChatToClipboard} title="Copy Chat">
            <Copy className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" title="Export Chat" />}>
              <Download className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setExportFormat('txt')}>Export as .txt</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExportFormat('pdf')}>Export as .pdf</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Dialog open={exportFormat !== null} onOpenChange={(open) => !open && setExportFormat(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Chat History</DialogTitle>
            <DialogDescription>
              Are you sure you want to export the current chat history as a {exportFormat?.toUpperCase()} file?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportFormat(null)}>Cancel</Button>
            <Button onClick={() => {
              if (exportFormat === 'txt') exportToTxt();
              if (exportFormat === 'pdf') exportToPdf();
              setExportFormat(null);
            }}>
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div 
        className={`flex-1 px-2 sm:px-4 md:px-8 py-4 sm:py-6 overflow-y-auto flex flex-col ${messages.length === 0 ? 'items-center justify-center' : ''}`} 
        ref={scrollRef} 
        onScroll={handleScroll}
      >
        <div className={`w-full max-w-[800px] mx-auto flex flex-col gap-6 ${messages.length === 0 ? 'items-center' : 'pb-24'}`}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center gap-6 w-full mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-white">Build your ideas with AI</h2>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground opacity-50">
                  <path d="M12 2L12.5 11.5L22 12L12.5 12.5L12 22L11.5 12.5L2 12L11.5 11.5L12 2Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              {inputBox}
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                isGenerating={isGenerating}
                onModify={handleModify}
              />
            ))
          )}
          {messages.length > 0 && messages[messages.length - 1].role === 'model' && !isGenerating && onRegenerate && (
            <div className="flex justify-center mt-2 mb-4">
              <Button variant="outline" size="sm" onClick={onRegenerate} className="gap-2 rounded-full shadow-sm text-muted-foreground hover:text-foreground">
                <RefreshCw className="w-4 h-4" />
                Regenerate response
              </Button>
            </div>
          )}
          {isGenerating && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">AI is thinking...</span>
            </div>
          )}
        </div>
      </div>

      {messages.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 bg-gradient-to-t from-background via-background to-transparent">
          <div className="max-w-[800px] mx-auto">
            {inputBox}
          </div>
          <div className="text-center mt-2 text-[10px] text-muted-foreground">
            Ask anything can make mistakes. Verify important information.
          </div>
        </div>
      )}
      <LiveVoiceDialog isOpen={isLiveVoiceOpen} onClose={() => setIsLiveVoiceOpen(false)} />
    </div>
  );
}
