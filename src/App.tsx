import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { ChatArea } from '@/components/ChatArea';
import { SettingsDialog } from '@/components/SettingsDialog';
import { firestoreService, Chat, Message } from '@/lib/firestore';
import { auth, signInWithGoogle, logOut, signInGuest } from '@/lib/firebase';
import { streamChat } from '@/lib/gemini';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Moon, Sun, PanelLeftOpen, LogIn, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AnimatePresence, motion } from 'motion/react';

function MainApp() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [guardrailsEnabled, setGuardrailsEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        (window as any).firebaseUserId = currentUser.uid;
        setIsAuthReady(true);
      } else {
        try {
          await signInGuest();
        } catch (error) {
          console.error('Failed to sign in anonymously', error);
          setIsAuthReady(true); // Still set to true to show login screen as fallback
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const isCreatingChat = useRef(false);

  useEffect(() => {
    if (!user || !isAuthReady) return;

    const unsubscribe = firestoreService.subscribeToChats(user.uid, async (fetchedChats) => {
      setChats(fetchedChats);
      if (fetchedChats.length > 0 && !currentChatId) {
        setCurrentChatId(fetchedChats[0].id);
      } else if (fetchedChats.length === 0 && !isCreatingChat.current) {
        isCreatingChat.current = true;
        try {
          const newChatId = await firestoreService.createChat(user.uid);
          setCurrentChatId(newChatId);
        } catch (error) {
          console.error("Failed to auto-create chat", error);
        } finally {
          isCreatingChat.current = false;
        }
      }
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  useEffect(() => {
    if (!user || !isAuthReady || !currentChatId) {
      setMessages([]);
      return;
    }

    const unsubscribe = firestoreService.subscribeToMessages(user.uid, currentChatId, (fetchedMessages) => {
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [user, isAuthReady, currentChatId]);

  useEffect(() => {
    // Theme setup
    const root = window.document.documentElement;
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }
  }, [theme]);

  const toggleTheme = (newTheme?: 'light' | 'dark' | 'system') => {
    const root = window.document.documentElement;
    const targetTheme = newTheme || (theme === 'dark' ? 'light' : 'dark');
    
    if (targetTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.remove('light', 'dark');
      root.classList.add(systemTheme);
    } else {
      root.classList.remove('light', 'dark');
      root.classList.add(targetTheme);
    }
    setTheme(targetTheme);
  };

  const currentChat = chats.find((c) => c.id === currentChatId);

  const handleNewChat = async () => {
    if (!user) return;
    try {
      const newChatId = await firestoreService.createChat(user.uid);
      setCurrentChatId(newChatId);
    } catch (error) {
      toast.error('Failed to create new chat');
    }
  };

  const handleDeleteChat = async (id: string) => {
    if (!user) return;
    try {
      await firestoreService.deleteChat(user.uid, id);
      if (currentChatId === id) {
        setCurrentChatId(chats.length > 1 ? chats.find(c => c.id !== id)?.id || null : null);
      }
    } catch (error) {
      toast.error('Failed to delete chat');
    }
  };

  const handleUpdateChatTitle = async (id: string, newTitle: string) => {
    if (!user) return;
    try {
      await firestoreService.updateChat(user.uid, id, { title: newTitle });
    } catch (error) {
      toast.error('Failed to update chat title');
    }
  };

  const handleSelectModel = async (model: string) => {
    if (user && currentChatId) {
      try {
        await firestoreService.updateChat(user.uid, currentChatId, { model });
      } catch (error) {
        toast.error('Failed to update model');
      }
    }
  };

  const handleSendMessage = async (text: string, attachment?: { data: string, mimeType: string }) => {
    if (!user || !currentChatId || !currentChat || (!text.trim() && !attachment)) return;

    setIsGenerating(true);

    try {
      if (['gemini-3.1-flash-image-preview', 'veo-3.1-fast-generate-preview', 'lyria-3-clip-preview'].includes(currentChat.model)) {
        if (typeof window !== 'undefined' && (window as any).aistudio) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          if (!hasKey) {
            await (window as any).aistudio.openSelectKey();
            // Assume success and continue
          }
        }
      }

      // Add user message
      await firestoreService.addMessage(user.uid, currentChatId, { 
        role: 'user', 
        text,
        mediaUrl: attachment ? `data:${attachment.mimeType};base64,${attachment.data}` : undefined,
        mediaType: attachment ? (attachment.mimeType.startsWith('image/') ? 'image' : attachment.mimeType.startsWith('video/') ? 'video' : 'audio') : undefined
      });

      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const stream = streamChat(currentChat.model, history, text, attachment, guardrailsEnabled);

      // Create empty model message
      const modelMessage = await firestoreService.addMessage(user.uid, currentChatId, { role: 'model', text: '' });
      
      let fullText = '';
      let mediaUrl = '';
      let mediaType: 'image' | 'video' | 'audio' | undefined;
      let groundingUrls: string[] = [];

      for await (const chunk of stream) {
        if (chunk.text) fullText += chunk.text;
        if (chunk.mediaUrl) mediaUrl = chunk.mediaUrl;
        if (chunk.mediaType) mediaType = chunk.mediaType;
        if (chunk.groundingUrls) {
          groundingUrls = Array.from(new Set([...groundingUrls, ...chunk.groundingUrls]));
        }

        // We update the local state for smooth streaming, but we don't spam Firestore
        setMessages(prev => {
          const newMsgs = [...prev];
          const idx = newMsgs.findIndex(m => m.id === modelMessage.id);
          if (idx !== -1) {
            newMsgs[idx] = { 
              ...newMsgs[idx], 
              text: fullText,
              mediaUrl: mediaUrl || undefined,
              mediaType: mediaType || undefined,
              groundingUrls: groundingUrls.length > 0 ? groundingUrls : undefined
            };
          }
          return newMsgs;
        });
      }
      
      // Save final text to storage
      await firestoreService.updateMessageText(user.uid, currentChatId, modelMessage.id, fullText);
      if (mediaUrl && mediaType) {
        await firestoreService.updateMessageMedia(user.uid, currentChatId, modelMessage.id, mediaUrl, mediaType);
      }
      if (groundingUrls.length > 0) {
        await firestoreService.updateMessageGrounding(user.uid, currentChatId, modelMessage.id, groundingUrls);
      }
      
    } catch (error: any) {
      console.error('Chat error:', error);
      toast.error(error.message || 'Failed to generate response. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!user || !currentChatId || !currentChat || messages.length < 2) return;
    
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'model') {
       await firestoreService.deleteMessage(user.uid, currentChatId, lastMessage.id);
    }
    
    const lastUserMessage = messages.slice().reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    await handleSendMessage(lastUserMessage.text);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (!isGenerating) {
          handleRegenerate();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isGenerating, messages, user, currentChatId, currentChat]);

  if (showIntro) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background text-foreground"
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-32 h-32 rounded-3xl bg-primary/10 flex items-center justify-center"
          >
            <span className="text-5xl font-bold text-primary tracking-tighter">AI</span>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!isAuthReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-background text-foreground p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h2 className="mt-6 text-3xl font-extrabold">Welcome to AI Chat</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to start chatting and generating content.
            </p>
          </div>
          <Button onClick={signInWithGoogle} className="w-full flex items-center justify-center gap-2" size="lg">
            <LogIn className="w-5 h-5" />
            Sign In
          </Button>
          <div className="mt-4 text-xs text-muted-foreground">
            <p>To allow access without login, please enable <strong>Anonymous</strong> authentication in your Firebase Console.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {isSidebarOpen && (
        <Sidebar
          user={user}
          chats={chats}
          currentChatId={currentChatId}
          onSelectChat={setCurrentChatId}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onUpdateChatTitle={handleUpdateChatTitle}
          onOpenSettings={() => setIsSettingsOpen(true)}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      )}
      
      <main className="flex-1 flex flex-col relative">
        
        {currentChat ? (
          <ChatArea
            user={user}
            messages={messages}
            isGenerating={isGenerating}
            onSendMessage={handleSendMessage}
            onRegenerate={handleRegenerate}
            selectedModel={currentChat.model}
            onSelectModel={handleSelectModel}
            chats={chats}
            currentChatId={currentChatId}
            onSelectChat={setCurrentChatId}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            onUpdateChatTitle={handleUpdateChatTitle}
            onOpenSettings={() => setIsSettingsOpen(true)}
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4 text-center">
            {!isSidebarOpen && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 left-4 hidden md:flex h-9 w-9 text-muted-foreground hover:text-foreground" 
                onClick={() => setIsSidebarOpen(true)}
              >
                <PanelLeftOpen className="w-5 h-5" />
              </Button>
            )}
            <div className="w-24 h-24 sm:w-32 sm:h-32 mb-4 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
              <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-primary relative z-10" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Welcome to BK's AI Chat!
            </h1>
            <p className="text-muted-foreground max-w-md mb-4">
              Experience the power of multiple AI models, voice dictation, and seamless file attachments in one place.
            </p>
            <Button onClick={handleNewChat} size="lg" className="rounded-full px-8">
              Start a new chat
            </Button>
          </div>
        )}
      </main>
      <Toaster />
      <SettingsDialog 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
        theme={theme}
        onThemeChange={toggleTheme}
        user={user}
        onLogout={logOut}
        guardrailsEnabled={guardrailsEnabled}
        onGuardrailsChange={setGuardrailsEnabled}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
