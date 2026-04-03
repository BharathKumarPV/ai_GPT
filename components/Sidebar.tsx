import { useState, useRef, useEffect } from 'react';
import { Chat } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2, Menu, Settings, PanelLeftClose, Search, Edit2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { User } from 'firebase/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface SidebarProps {
  user: User;
  chats: Chat[];
  currentChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onUpdateChatTitle: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  isMobile?: boolean;
  toggleSidebar?: () => void;
}

export function Sidebar({
  user,
  chats,
  currentChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onUpdateChatTitle,
  onOpenSettings,
  isMobile = false,
  toggleSidebar,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const handleOpenSettings = () => {
    setIsOpen(false);
    onOpenSettings();
  };

  const handleSelectChat = (id: string) => {
    if (editingChatId) return;
    setIsOpen(false);
    onSelectChat(id);
  };

  const handleNewChat = () => {
    setIsOpen(false);
    onNewChat();
  };

  const startEditing = (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const saveEdit = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    if (editingChatId && editTitle.trim()) {
      onUpdateChatTitle(editingChatId, editTitle.trim());
    }
    setEditingChatId(null);
  };

  const cancelEdit = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    setEditingChatId(null);
  };

  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingChatId]);

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const content = (
    <div className="flex flex-col h-full bg-muted/50 w-64 border-r border-border">
      <div className="p-4 flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">AI</span>
        {!isMobile && toggleSidebar && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div className="px-4 pb-2 space-y-2">
        <Button onClick={handleNewChat} className="w-full justify-start gap-2 h-11 text-base font-medium shadow-sm transition-all hover:scale-[1.02]" variant="default">
          <Plus className="w-5 h-5" />
          New Chat
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search chats..."
            className="w-full pl-9 h-9 bg-background/50 border-border/50 focus-visible:ring-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="flex flex-col gap-1 pb-4">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors",
                currentChatId === chat.id
                  ? "bg-secondary text-secondary-foreground"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
              onClick={() => handleSelectChat(chat.id)}
            >
              <div className="flex items-center gap-2 overflow-hidden flex-1">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <div className="flex flex-col overflow-hidden flex-1">
                  {editingChatId === chat.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        ref={editInputRef}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(e);
                          if (e.key === 'Escape') cancelEdit(e);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-6 text-sm px-1 py-0 w-full bg-background border-primary/50"
                      />
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 hover:bg-background" onClick={saveEdit} title="Save">
                        <Check className="h-3 w-3 text-green-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 hover:bg-background" onClick={cancelEdit} title="Cancel">
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span 
                        className="text-sm truncate cursor-text" 
                        onDoubleClick={(e) => startEditing(e, chat)}
                        title="Double-click to edit"
                      >
                        {chat.title}
                      </span>
                      <span className="text-[10px] opacity-70">
                        {formatDistanceToNow(chat.updatedAt, { addSuffix: true })}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {editingChatId !== chat.id && (
                <div className="flex items-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-background/50"
                    onClick={(e) => startEditing(e, chat)}
                    title="Edit chat title"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    title="Delete chat"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          {filteredChats.length === 0 && searchQuery && (
            <div className="text-center text-sm text-muted-foreground py-4">
              No chats found.
            </div>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t border-border mt-auto flex flex-col gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="w-full justify-start gap-3 px-2 h-auto py-2 hover:bg-muted" />}>
            <Avatar className="w-8 h-8 border border-border">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
                {getInitials(user.displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start overflow-hidden">
              <span className="text-sm font-medium truncate w-full">{user.displayName || user.email || 'Anonymous User'}</span>
              <span className="text-[10px] text-muted-foreground truncate w-full">Personal Workspace</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleOpenSettings} className="cursor-pointer gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => window.open('#privacy-policy', '_blank')}>
              Privacy Policy
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => window.open('#terms-of-service', '_blank')}>
              Terms of Service
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
          <Menu className="w-5 h-5" />
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return <div className="hidden md:block h-full">{content}</div>;
}
