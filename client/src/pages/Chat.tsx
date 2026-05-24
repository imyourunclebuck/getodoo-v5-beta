import { useEffect, useRef, useState, useCallback } from "react";
import { useChatHistory, useSendMessage, useClearChat } from "@/hooks/use-chat";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { SettingsDialog } from "@/components/SettingsDialog";
import { OdooLoginDialog } from "@/components/OdooLoginDialog";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Bot, User, Trash2, Loader2, Database, PanelLeftClose, PanelLeft, ExternalLink, AlertTriangle, Info, X, LogOut, Sun, Moon, Mic, MicOff, Volume2, VolumeX, Square } from "lucide-react";
import { useVoice } from "@/hooks/use-voice";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

function LuminLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="url(#lumin-grad)" />
      <path d="M10 8v16h8v-3h-4.5V8H10z" fill="white" fillOpacity="0.95" />
      <circle cx="22" cy="10" r="2.5" fill="white" fillOpacity="0.8" />
      <defs>
        <linearGradient id="lumin-grad" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="hsl(211, 100%, 50%)" />
          <stop offset="1" stopColor="hsl(230, 100%, 60%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function OdooPanel({ odooUrl, iframeUrl, onClose, iframeRef, iframeError, setIframeError }: {
  odooUrl: string;
  iframeUrl: string;
  onClose: () => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  iframeError: boolean;
  setIframeError: (val: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (iframeError) return;
    setLoading(true);
    const timeout = setTimeout(() => {
      if (iframeRef.current) {
        try {
          const doc = iframeRef.current.contentDocument;
          if (!doc || !doc.body || doc.body.innerHTML === "") {
            setIframeError(true);
          }
        } catch {
          setLoading(false);
        }
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [iframeUrl, iframeError]);

  const handleLoad = () => {
    setLoading(false);
    if (iframeRef.current) {
      try {
        const doc = iframeRef.current.contentDocument;
        if (!doc || !doc.body || doc.body.innerHTML === "") {
          setIframeError(true);
        }
      } catch {
      }
    }
  };

  return (
    <div className="h-full flex flex-col border-r border-border bg-background" data-testid="odoo-panel">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-muted-foreground truncate">{odooUrl}</span>
          <a
            href={iframeUrl || odooUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            title="Open in new tab"
            data-testid="link-odoo-external"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Close Odoo panel"
          data-testid="button-close-odoo-panel"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={iframeUrl || `${odooUrl}/web`}
          className="w-full h-full border-0"
          title="Odoo"
          onLoad={handleLoad}
          onError={() => setIframeError(true)}
          referrerPolicy="no-referrer"
          data-testid="iframe-odoo"
        />
      </div>
    </div>
  );
}

export default function Chat() {
  const [input, setInput] = useState("");
  const [showOdoo, setShowOdoo] = useState(false);
  const [odooIframeUrl, setOdooIframeUrl] = useState("");
  const [iframeError, setIframeError] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showBeta, setShowBeta] = useState(false);
  const [panelWidth, setPanelWidth] = useState(55);
  const [loginOpen, setLoginOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const { mutate: updateSettings } = useUpdateSettings();
  const { data: history, isLoading: isLoadingHistory } = useChatHistory();
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutate: clearChat, isPending: isClearing } = useClearChat();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const {
    voiceMode, toggleVoiceMode,
    isListening, isSpeaking, isLoadingVoice, speakingMessageId, transcript,
    startListening, stopListening,
    speakText, stopSpeaking,
    supportsRecognition,
  } = useVoice();
  const lastSpokenRef = useRef<number | null>(null);

  const isConfigured = !!settings?.odooUrl && !!settings?.odooDb;
  const odooUrl = settings?.odooUrl?.replace(/\/$/, "") || "";
  const loggedInUser = settings?.odooUsername || "";
  const sampleQuestions = [
    "What products are low in stock?",
    "Show my top customers this month.",
    "List open invoices with amounts due.",
    "What manufacturing orders are in progress?",
    "Summarize revenue for this quarter.",
  ];
  const appStatus = settings?.odooDb ? "Connected" : "Not configured";
  const lastOperational = history?.length ? format(new Date(history[history.length - 1].createdAt), "PPP p") : "No activity yet";
  const storageSummary = history?.length ? `${history.length} chat records stored` : "No chat records stored";
  const uptimeSummary = "Available while the app is running";
  const betaRequestCount = 65;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isSending]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      fetch("/api/chat/clear", {
        method: "DELETE",
        credentials: "include",
        keepalive: true,
      });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!voiceMode || !history?.length) return;
    const lastMsg = history[history.length - 1];
    if (lastMsg.role === "assistant" && lastMsg.id !== lastSpokenRef.current) {
      lastSpokenRef.current = lastMsg.id;
      speakText(lastMsg.content);
    }
  }, [history, voiceMode, speakText]);

  const navigateOdooIframe = useCallback((url: string) => {
    if (showOdoo && iframeRef.current && !iframeError) {
      try {
        iframeRef.current.src = url;
        setOdooIframeUrl(url);
      } catch {
        window.open(url, "_blank");
      }
    } else if (showOdoo && iframeError) {
      window.open(url, "_blank");
    } else {
      window.open(url, "_blank");
    }
  }, [showOdoo, iframeError]);

  const handleOdooLink = useCallback((href: string) => {
    const odooPathMatch = href.match(/\/odoo\/([^/]+)\/(\d+)/);
    if (odooPathMatch && odooUrl) {
      const [, model, id] = odooPathMatch;
      const webUrl = `${odooUrl}/web#id=${id}&model=${model}&view_type=form`;
      if (showOdoo && !iframeError) {
        navigateOdooIframe(webUrl);
      } else {
        window.open(webUrl, "_blank");
      }
      return true;
    }
    return false;
  }, [odooUrl, showOdoo, iframeError, navigateOdooIframe]);

  const handleSend = () => {
    if (!input.trim() || isSending) return;

    sendMessage(input, {
      onError: (error) => {
        toast({
          title: "Failed to send message",
          description: error.message,
          variant: "destructive",
        });
      },
    });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear the chat history?")) {
      clearChat();
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to disconnect?")) {
      updateSettings(
        { odooUrl: "", odooDb: "", odooUsername: "", odooPassword: "", responseStyle: "detailed" },
        {
          onSuccess: () => {
            toast({ title: "Disconnected", description: "Your session has been cleared." });
          },
        }
      );
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setPanelWidth(Math.min(Math.max(pct, 25), 75));
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  if (isLoadingSettings) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background p-4">
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            data-testid="button-theme-toggle-setup"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <div className="max-w-md w-full text-center space-y-6">
          <LuminLogo className="h-20 w-20 mx-auto" />
          <h1 className="text-3xl font-semibold text-foreground" data-testid="text-welcome-title">Lumin Laboratories</h1>
          <p className="text-muted-foreground">
            Connect to your Odoo instance to start chatting with your ERP assistant.
          </p>
          <Button
            onClick={() => setLoginOpen(true)}
            className="w-full h-12 text-base font-semibold text-white rounded"
            style={{ backgroundColor: "#714B67", borderColor: "#714B67" }}
            data-testid="button-login-with-odoo"
          >
            Login with your Odoo
          </Button>
        </div>
        <OdooLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </div>
    );
  }

  const markdownComponents = {
    a: ({ href, children, ...props }: any) => {
      const isOdooLink = href && href.includes("/odoo/");
      return (
        <a
          href={href}
          onClick={(e) => {
            if (isOdooLink && handleOdooLink(href)) {
              e.preventDefault();
            }
          }}
          target={isOdooLink ? undefined : "_blank"}
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors"
          data-testid="link-odoo-record"
          {...props}
        >
          {children}
        </a>
      );
    },
  };

  const chatContent = (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LuminLogo className="h-8 w-8" />
            <div>
              <h1 className="font-semibold text-base leading-none" data-testid="text-app-title">Lumin Laboratories</h1>
              <p className="text-xs text-muted-foreground mt-0.5">AI Assistant for Odoo ERP</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {loggedInUser && (
              <span className="text-xs text-muted-foreground mr-1 hidden sm:inline" data-testid="text-logged-in-user">{loggedInUser}</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              data-testid="button-theme-toggle"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowInfo(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Agent stats"
              data-testid="button-agent-info"
            >
              <Info className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClear}
              disabled={!history?.length || isClearing}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Clear History"
              data-testid="button-clear-chat"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <SettingsDialog />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Disconnect"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      {showInfo && (
        <div className="fixed inset-y-0 left-0 z-50 flex w-full max-w-md">
          <div className="flex h-full w-full flex-col border-r border-border bg-background shadow-2xl" data-testid="dialog-agent-info">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">Agent stats</h2>
                <p className="text-xs text-muted-foreground">Status, uptime, storage</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowInfo(false)} data-testid="button-close-agent-info">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Agent</span><span className="font-medium text-right">Lumin Laboratories</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Database</span><span className="font-medium text-right">{appStatus}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Last operational</span><span className="font-medium text-right">{lastOperational}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Uptime</span><span className="font-medium text-right">{uptimeSummary}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Storage</span><span className="font-medium text-right">{storageSummary}</span></div>
                </div>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium">Beta access</h3>
                    <p className="text-xs text-muted-foreground">Request early access and future payment features.</p>
                  </div>
                  <span className="rounded-full bg-background px-2 py-1 text-xs font-medium text-foreground" data-testid="text-beta-request-count">{betaRequestCount}</span>
                </div>
                <div className="mt-3">
                  <a
                    href="mailto:hodgkinsaaron@gmail.com?subject=Beta%20Access%20Request&body=Please%20share%20your%20name,%20company,%20email,%20and%20why%20you%20want%20beta%20access."
                    className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    data-testid="button-request-beta"
                  >
                    Request beta access
                  </a>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-medium mb-2">Sample questions</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {sampleQuestions.map((question) => (
                    <li key={question} className="rounded-md bg-background px-3 py-2 border border-border/60" data-testid={`text-sample-question-${question.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>{question}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-muted/30" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-6 pb-4">
          {isLoadingHistory ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history?.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="bg-background border border-border rounded-2xl p-8 shadow-sm max-w-sm mx-auto">
                <LuminLogo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold text-lg" data-testid="text-no-messages">No messages yet</h3>
                <p className="text-muted-foreground text-sm">
                  Start by asking about your sales, inventory, or customers.
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {history?.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm
                    ${msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-foreground'}
                  `}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>

                  <div className={`max-w-[80%] space-y-1 ${msg.role === 'user' ? 'items-end flex flex-col' : ''}`}>
                    <div className={`
                      rounded-2xl px-5 py-3 shadow-sm text-sm
                      ${msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-card border border-border text-foreground rounded-tl-sm prose-custom'}
                    `}>
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown components={markdownComponents}>{msg.content}</ReactMarkdown>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 px-1">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(msg.createdAt), "h:mm a")}
                      </span>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => {
                            if (isSpeaking && speakingMessageId === msg.id) {
                              stopSpeaking();
                            } else {
                              speakText(msg.content, msg.id);
                            }
                          }}
                          className="text-muted-foreground hover:text-primary transition-colors p-0.5"
                          title={isSpeaking && speakingMessageId === msg.id ? "Stop" : "Play response"}
                          data-testid={`button-speak-msg-${msg.id}`}
                        >
                          {isSpeaking && speakingMessageId === msg.id ? <Square className="h-3 w-3 fill-current" /> : <Volume2 className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {isSending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shadow-sm">
                <Bot className="h-4 w-4 text-foreground" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex gap-1 items-center">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <footer className="bg-background border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          {isSpeaking && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="w-0.5 bg-primary rounded-full animate-pulse"
                      style={{
                        height: `${8 + Math.random() * 12}px`,
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: "0.6s",
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-primary font-medium" data-testid="text-voice-status">
                  {isLoadingVoice ? "Loading voice…" : "Speaking"}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={stopSpeaking}
                  className="h-6 w-6 text-primary hover:text-destructive hover:bg-destructive/10"
                  data-testid="button-stop-speaking"
                >
                  <Square className="h-3 w-3 fill-current" />
                </Button>
              </div>
            </div>
          )}
          {isListening && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                  {transcript || "Listening..."}
                </span>
              </div>
            </div>
          )}
          <Card className="flex items-center gap-2 p-2 pl-4 rounded-xl border-border shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <Input
              value={transcript || input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about orders, products, or customers..."
              className="border-none shadow-none focus-visible:ring-0 px-0 h-auto py-2 text-base bg-transparent"
              disabled={isSending || isListening}
              data-testid="input-chat"
            />
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleVoiceMode}
                className={`rounded-lg h-9 w-9 transition-all ${voiceMode ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                title={voiceMode ? "Voice mode on" : "Voice mode off"}
                data-testid="button-voice-toggle"
              >
                {voiceMode ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              {supportsRecognition && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (isListening) {
                      stopListening();
                    } else {
                      startListening((text) => {
                        if (voiceMode && text.trim()) {
                          setInput("");
                          sendMessage(text.trim(), {
                            onError: (error) => {
                              toast({
                                title: "Failed to send message",
                                description: error.message,
                                variant: "destructive",
                              });
                            },
                          });
                        } else {
                          setInput(text);
                        }
                      });
                    }
                  }}
                  disabled={isSending}
                  className={`rounded-lg h-9 w-9 transition-all ${isListening ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' : 'text-muted-foreground hover:text-foreground'}`}
                  title={isListening ? "Stop listening" : "Speak your message"}
                  data-testid="button-mic"
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isSending}
                size="icon"
                className={`
                  rounded-lg transition-all duration-200
                  ${input.trim() ? 'bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25' : 'bg-muted text-muted-foreground'}
                `}
                data-testid="button-send"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </Card>
          <p className="text-center text-xs text-muted-foreground mt-2">
            AI can make mistakes. Verify important Odoo data.
          </p>
        </div>
      </footer>
    </div>
  );

  if (showOdoo) {
    return (
      <div ref={containerRef} className="h-screen w-full bg-background flex overflow-hidden">
        <div style={{ width: `${panelWidth}%` }} className="h-full flex-shrink-0">
          <OdooPanel
            odooUrl={odooUrl}
            iframeUrl={odooIframeUrl}
            onClose={() => setShowOdoo(false)}
            iframeRef={iframeRef}
            iframeError={iframeError}
            setIframeError={setIframeError}
          />
        </div>

        <div
          onMouseDown={handleMouseDown}
          className="w-1.5 bg-border hover:bg-primary/50 cursor-col-resize transition-colors flex-shrink-0 relative group"
          data-testid="panel-resize-handle"
        >
          <div className="absolute inset-y-0 -left-1 -right-1" />
        </div>

        <div style={{ width: `${100 - panelWidth}%` }} className="h-full flex-shrink-0">
          {chatContent}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background flex flex-col overflow-hidden">
      {chatContent}
    </div>
  );
}
