import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Bell,
  Smile,
  LayoutGrid,
  Database,
  Shield,
  UserCheck,
  User as UserIcon,
  X,
  Key,
  Activity,
  Smartphone,
  Monitor,
  Sun,
  Moon,
  LogOut,
  FileText
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  user?: User | null;
  onLogout?: () => void;
  guardrailsEnabled?: boolean;
  onGuardrailsChange?: (enabled: boolean) => void;
}

const TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'personalization', label: 'Personalization', icon: Smile },
  { id: 'apps', label: 'Apps', icon: LayoutGrid },
  { id: 'data', label: 'Data controls', icon: Database },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'parental', label: 'Parental controls', icon: UserCheck },
  { id: 'account', label: 'Account', icon: UserIcon },
  { id: 'legal', label: 'Legal & Privacy', icon: FileText },
];

export function SettingsDialog({ open, onOpenChange, theme, onThemeChange, user, onLogout, guardrailsEnabled, onGuardrailsChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [showMfaSetup, setShowMfaSetup] = useState(false);

  const getDeviceString = () => {
    if (typeof navigator === 'undefined') return 'Unknown Device';
    const ua = navigator.userAgent;
    let browser = 'Unknown Browser';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edg')) browser = 'Edge';
    
    let os = 'Unknown OS';
    if (ua.includes('Mac OS')) os = 'Mac';
    else if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    
    return `${os} - ${browser}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-5xl sm:max-w-5xl w-full h-[100dvh] sm:w-[90vw] sm:h-[85vh] p-0 gap-0 overflow-hidden flex flex-col md:flex-row bg-background sm:rounded-2xl rounded-none border-border/50 shadow-2xl">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border shrink-0 bg-background z-10">
          <DialogTitle className="text-lg font-semibold">Settings</DialogTitle>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Sidebar / Topbar on mobile */}
        <div className="w-full md:w-56 lg:w-64 bg-muted/30 border-b md:border-b-0 md:border-r border-border/50 flex flex-col md:h-full shrink-0">
          <div className="hidden md:flex p-6 pb-2">
            <DialogTitle className="text-xl font-semibold">Settings</DialogTitle>
          </div>
          <div className="w-full md:flex-1 px-3 py-2 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden scrollbar-hide">
            <div className="flex flex-row md:flex-col gap-1 pb-2 md:pb-0 min-w-max md:min-w-0">
              {TABS.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                  className={cn(
                    "justify-start gap-3 px-3 py-2 md:py-3 h-auto font-medium transition-colors whitespace-nowrap",
                    activeTab === tab.id ? "bg-secondary/80" : "hover:bg-muted/50"
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground shrink-0" />
                  <span className="text-sm md:text-base">{tab.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-background relative">
          <div className="hidden md:block absolute top-4 right-4 z-10">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-muted">
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="flex-1 p-4 md:p-8 md:pt-16 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-8 pb-10">
              {activeTab === 'general' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-medium">Secure your account</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add multi-factor authentication (MFA), like a passkey or text message, to help protect your account when logging in.
                      </p>
                    </div>
                    <Button variant="secondary" className="shrink-0 whitespace-nowrap">Set up MFA</Button>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <span className="font-medium">Appearance</span>
                      <Tabs value={theme} onValueChange={onThemeChange as any} className="w-full sm:w-auto">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="system" className="flex items-center gap-2 text-xs">
                            <Monitor className="w-3 h-3" />
                            System
                          </TabsTrigger>
                          <TabsTrigger value="light" className="flex items-center gap-2 text-xs">
                            <Sun className="w-3 h-3" />
                            Light
                          </TabsTrigger>
                          <TabsTrigger value="dark" className="flex items-center gap-2 text-xs">
                            <Moon className="w-3 h-3" />
                            Dark
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                    <Separator className="bg-border/50" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <span className="font-medium">Accent color</span>
                      <Select defaultValue="default">
                        <SelectTrigger className="w-full sm:w-[180px] bg-muted/50 border-0">
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-primary" />
                              Default
                            </div>
                          </SelectItem>
                          <SelectItem value="blue">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500" />
                              Blue
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator className="bg-border/50" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <span className="font-medium">Language</span>
                      <Select defaultValue="auto">
                        <SelectTrigger className="w-full sm:w-[180px] bg-muted/50 border-0">
                          <SelectValue placeholder="Auto-detect" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Auto-detect</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator className="bg-border/50" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="font-medium">Spoken language</span>
                        <span className="text-sm text-muted-foreground mt-1 max-w-[80%]">
                          For best results, select the language you mainly speak. If it's not listed, it may still be supported via auto-detection.
                        </span>
                      </div>
                      <Select defaultValue="en">
                        <SelectTrigger className="w-full sm:w-[180px] bg-muted/50 border-0">
                          <SelectValue placeholder="English" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator className="bg-border/50" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <span className="font-medium">Voice</span>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" className="rounded-full bg-muted/50">
                          ▶ Play
                        </Button>
                        <Select defaultValue="spruce">
                          <SelectTrigger className="w-full sm:w-[140px] bg-muted/50 border-0">
                            <SelectValue placeholder="Spruce" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spruce">Spruce</SelectItem>
                            <SelectItem value="juniper">Juniper</SelectItem>
                            <SelectItem value="cove">Cove</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Separator className="bg-border/50" />

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="font-medium">Separate Voice</span>
                        <span className="text-sm text-muted-foreground mt-1">
                          Keep AI Voice in a separate full screen, without real time transcripts and visuals.
                        </span>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h2 className="text-2xl font-semibold mb-6">Account</h2>
                  
                  <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <Avatar className="w-16 h-16 shrink-0 border border-border/50 shadow-sm">
                        <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} referrerPolicy="no-referrer" />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">
                          {user?.email?.[0]?.toUpperCase() || user?.displayName?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="overflow-hidden">
                        <h3 className="font-medium text-lg truncate">{user?.displayName || 'User'}</h3>
                        <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
                      </div>
                    </div>
                    {onLogout ? (
                      <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={onLogout}>
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full sm:w-auto">Edit Profile</Button>
                    )}
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Workspace</p>
                          <p className="text-sm text-muted-foreground">Personal</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Upgrade to Plus</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && !showMfaSetup && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h2 className="text-2xl font-semibold mb-6">Security</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Prompt Guardrails
                      </h3>
                      <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">Enable AI Guardrails</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Pre-process inputs for prompt injection and post-process outputs for harmful content.
                          </p>
                        </div>
                        <Switch 
                          checked={guardrailsEnabled} 
                          onCheckedChange={onGuardrailsChange} 
                        />
                      </div>
                    </div>

                    <Separator className="bg-border/50" />

                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary" />
                        API Keys
                      </h3>
                      <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-4">
                        <p className="text-sm text-muted-foreground">
                          API keys are managed securely by the server administrator and are not directly exposed to the client.
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">OpenAI API Key</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                                Configured
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Anthropic API Key</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                                Configured
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">AI API Key</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono bg-muted px-2 py-1 rounded text-muted-foreground">
                                Configured
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" className="w-full mt-2" disabled>Update Keys (Admin Only)</Button>
                      </div>
                    </div>

                    <Separator className="bg-border/50" />

                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-primary" />
                        Two-Factor Authentication (2FA)
                      </h3>
                      <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">Authenticator App</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Use an authenticator app to generate verification codes.
                          </p>
                        </div>
                        <Button variant="secondary" className="shrink-0 whitespace-nowrap" onClick={() => setShowMfaSetup(true)}>Set up MFA</Button>
                      </div>
                    </div>

                    <Separator className="bg-border/50" />

                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Recent Activity
                      </h3>
                      <div className="bg-muted/30 rounded-xl border border-border/50 divide-y divide-border/50">
                        <div className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{getDeviceString()}</p>
                            <p className="text-xs text-muted-foreground">Active now</p>
                          </div>
                          <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">Current</span>
                        </div>
                        <div className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">Mobile Device</p>
                            <p className="text-xs text-muted-foreground">2 hours ago</p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">Sign out</Button>
                        </div>
                      </div>
                    </div>
                    
                    <Button onClick={() => setActiveTab('security-advanced')} className="w-full mt-4" variant="outline">
                      Security Advanced and Settings
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'security' && showMfaSetup && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => setShowMfaSetup(false)}>
                      <X className="w-5 h-5" />
                    </Button>
                    <h2 className="text-2xl font-semibold">Set up MFA</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-muted/30 p-6 rounded-xl border border-border/50 text-center space-y-4">
                      <div className="w-32 h-32 bg-white rounded-lg mx-auto flex items-center justify-center border border-border">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=otpauth://totp/AI%20App:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=AI%20App" alt="QR Code" className="w-28 h-28" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Scan this QR code with your authenticator app.
                      </p>
                      <div className="pt-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Or enter this code manually:</p>
                        <code className="bg-muted px-4 py-2 rounded-md font-mono text-sm tracking-widest">JBSW Y3DP EHPK 3PXP</code>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Verify Code</label>
                      <div className="flex gap-2">
                        <input type="text" placeholder="000000" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono tracking-widest text-center" maxLength={6} />
                      </div>
                      <Button className="w-full" onClick={() => { setShowMfaSetup(false); alert('MFA Enabled Successfully!'); }}>Verify and Enable</Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security-advanced' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h2 className="text-2xl font-semibold mb-6">Security Advanced and Settings</h2>
                  <div className="space-y-6">
                    <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-4">
                      <h3 className="font-medium">All Security Features</h3>
                      <p className="text-sm text-muted-foreground">
                        Manage advanced security configurations, audit logs, and compliance settings for your workspace.
                      </p>
                      <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">Require MFA for all users</p>
                            <p className="text-xs text-muted-foreground">Enforce 2FA across the entire workspace.</p>
                          </div>
                          <Switch />
                        </div>
                        <Separator className="bg-border/50" />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">Session Timeout</p>
                            <p className="text-xs text-muted-foreground">Automatically log out inactive users.</p>
                          </div>
                          <Select defaultValue="30m">
                            <SelectTrigger className="w-[120px] bg-muted/50 border-0">
                              <SelectValue placeholder="30 minutes" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15m">15 minutes</SelectItem>
                              <SelectItem value="30m">30 minutes</SelectItem>
                              <SelectItem value="1h">1 hour</SelectItem>
                              <SelectItem value="never">Never</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Separator className="bg-border/50" />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">IP Whitelisting</p>
                            <p className="text-xs text-muted-foreground">Restrict access to specific IP addresses.</p>
                          </div>
                          <Button variant="outline" size="sm">Configure</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'legal' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h2 className="text-2xl font-semibold mb-6">Legal & Privacy</h2>
                  <div className="space-y-6">
                    <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">Privacy Policy</p>
                            <p className="text-xs text-muted-foreground">Read our privacy policy to understand how we handle your data.</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => window.open('#privacy-policy', '_blank')}>View</Button>
                        </div>
                        <Separator className="bg-border/50" />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">Terms of Service</p>
                            <p className="text-xs text-muted-foreground">Read our terms of service.</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => window.open('#terms-of-service', '_blank')}>View</Button>
                        </div>
                        <Separator className="bg-border/50" />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">Cookie Policy</p>
                            <p className="text-xs text-muted-foreground">Manage your cookie preferences.</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => window.open('#cookie-policy', '_blank')}>View</Button>
                        </div>
                        <Separator className="bg-border/50" />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">Data Processing Agreement</p>
                            <p className="text-xs text-muted-foreground">Review our DPA for enterprise compliance.</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => window.open('#dpa', '_blank')}>View</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab !== 'general' && activeTab !== 'account' && activeTab !== 'security' && activeTab !== 'security-advanced' && activeTab !== 'legal' && (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-in fade-in duration-300">
                  <Settings className="w-12 h-12 mb-4 opacity-20" />
                  <p>Settings for {TABS.find(t => t.id === activeTab)?.label} will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
