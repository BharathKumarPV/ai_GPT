import { Message } from '@/lib/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, RefreshCw, Check, ExternalLink, Volume2, Square, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
  isGenerating?: boolean;
  onModify?: (instruction: string) => void;
}

export function MessageBubble({ message, isLast, isGenerating, onModify }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (isPlaying) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isPlaying]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSpeech = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(message.text);
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("group flex w-full gap-2 sm:gap-4 py-4 sm:py-6", isUser ? "justify-end" : "justify-start")}
    >
      {!isUser && (
        <Avatar className="w-6 h-6 sm:w-8 sm:h-8 border border-border shrink-0 mt-1">
          <AvatarFallback className="bg-primary text-primary-foreground text-[10px] sm:text-xs">AI</AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "flex flex-col gap-1.5 sm:gap-2 max-w-[90%] md:max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "px-3 sm:px-4 py-2 sm:py-3 rounded-2xl text-sm sm:text-base",
          isUser 
            ? "bg-primary text-primary-foreground rounded-tr-sm" 
            : "bg-muted text-foreground rounded-tl-sm"
        )}>
          {message.mediaUrl && message.mediaType === 'image' && (
            <img src={message.mediaUrl} alt="Generated" className="max-w-full rounded-lg mb-2" referrerPolicy="no-referrer" />
          )}
          {message.mediaUrl && message.mediaType === 'video' && (
            <video src={message.mediaUrl} controls className="max-w-full rounded-lg mb-2" />
          )}
          {message.mediaUrl && message.mediaType === 'audio' && (
            <audio src={message.mediaUrl} controls className="w-full mb-2" />
          )}
          
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.text}</div>
          ) : (
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none break-words">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code({node, inline, className, children, ...props}: any) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        {...props}
                        children={String(children).replace(/\n$/, '')}
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                      />
                    ) : (
                      <code {...props} className={className}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {message.text}
              </ReactMarkdown>
              {isGenerating && isLast && (
                <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle" />
              )}
            </div>
          )}
        </div>
        
        {message.groundingUrls && message.groundingUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.groundingUrls.map((url, index) => {
              try {
                const hostname = new URL(url).hostname;
                return (
                  <a 
                    key={index} 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md hover:bg-secondary/80 transition-colors"
                  >
                    <ExternalLink size={12} />
                    <span className="truncate max-w-[150px]">{hostname}</span>
                  </a>
                );
              } catch (e) {
                return null;
              }
            })}
          </div>
        )}

        <div className={cn(
          "flex items-center gap-1 mt-1",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          {!isUser && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={toggleSpeech} title={isPlaying ? "Stop speaking" : "Read aloud"}>
                {isPlaying ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              {onModify && !isGenerating && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Modify response" />}>
                    <Wand2 className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => onModify('Shorter')}>Shorter</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onModify('Longer')}>Longer</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onModify('Simpler')}>Simpler</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onModify('More Professional')}>More Professional</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onModify('More Casual')}>More Casual</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
          <Button variant="ghost" size="icon" className={cn("h-8 w-8", isUser ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground")} onClick={handleCopy} title="Copy to clipboard">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isUser && (
        <Avatar className="w-8 h-8 border border-border">
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">U</AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  );
}
