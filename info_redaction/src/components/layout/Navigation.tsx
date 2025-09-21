import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Brain, Upload, Eye, History, Download, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", path: "/", icon: Upload },
  { name: "Document Viewer", path: "/viewer", icon: Eye },
  { name: "Logs & History", path: "/history", icon: History },
  { name: "Export", path: "/export", icon: Download },
];

export const Navigation = () => {
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <nav className="glass-card border-b border-card-border sticky top-0 z-50 backdrop-blur-xl">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Brain className="h-8 w-8 text-primary ai-brain" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-glow-rotate" />
              </div>
              <div>
                <h1 className="text-xl font-cyber font-bold bg-gradient-primary bg-clip-text text-transparent">
                  AI PII Redactor
                </h1>
                <p className="text-xs text-muted-foreground font-inter">
                  Futuristic Document Protection
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/30 shadow-glow"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* AI Assistant Toggle */}
            <Button
              variant="ai"
              size="sm"
              onClick={() => setIsAiChatOpen(!isAiChatOpen)}
              className={cn(
                "relative",
                isAiChatOpen && "bg-secondary/20 border-secondary/50"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">AI Assistant</span>
              {isAiChatOpen && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse" />
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* AI Chat Sidebar */}
      {isAiChatOpen && (
        <div className="fixed right-0 top-16 bottom-0 w-96 glass-card border-l border-card-border z-40 overflow-hidden">
          <div className="p-4 border-b border-card-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-secondary ai-brain" />
                <h3 className="font-cyber font-semibold text-secondary">
                  AI Assistant
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAiChatOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </Button>
            </div>
          </div>
          
          <div className="flex-1 p-4 space-y-4 h-full overflow-y-auto">
            <div className="space-y-3">
              <div className="glass-card p-3 border border-secondary/20">
                <p className="text-sm text-secondary font-medium mb-2">
                  🤖 AI Ready
                </p>
                <p className="text-xs text-muted-foreground">
                  I'm here to help you with PII redaction decisions. Upload a document to get started!
                </p>
              </div>
              
              <div className="glass-card p-3 border border-accent/20">
                <p className="text-sm text-accent font-medium mb-2">
                  💡 Quick Actions
                </p>
                <div className="space-y-2 text-xs">
                  <button className="w-full text-left p-2 rounded hover:bg-accent/10 transition-colors">
                    Analyze document for PII
                  </button>
                  <button className="w-full text-left p-2 rounded hover:bg-accent/10 transition-colors">
                    Review redaction suggestions
                  </button>
                  <button className="w-full text-left p-2 rounded hover:bg-accent/10 transition-colors">
                    Export redacted document
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-auto pt-4 border-t border-card-border">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Ask AI anything..."
                  className="flex-1 bg-input border border-input-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50"
                />
                <Button variant="neural" size="sm">
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};