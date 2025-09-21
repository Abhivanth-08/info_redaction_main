import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Brain, X, Minimize2, Maximize2, Sparkles, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  metadata?: {
    confidence?: number;
    piiDetected?: number;
    action?: string;
  };
}

const initialMessages: Message[] = [
  {
    id: '1',
    type: 'ai',
    content: "Hello! I'm your AI redaction assistant. I can help you with PII detection strategies, policy recommendations, and document processing guidance. How can I assist you today?",
    timestamp: new Date(),
    suggestions: [
      "Optimize redaction policies",
      "Explain PII detection accuracy", 
      "Help with batch processing",
      "Review security settings"
    ]
  }
];

const aiResponses = [
  {
    trigger: ["pii", "detection", "accuracy"],
    response: "Our AI achieves 99.7% accuracy in PII detection using advanced neural networks. We can identify names, addresses, SSNs, phone numbers, emails, and medical information with high confidence.",
    metadata: { confidence: 99.7, action: "detection" }
  },
  {
    trigger: ["policy", "redaction", "strategy"],
    response: "I recommend a multi-layered redaction strategy: anonymize high-risk data like SSNs, use dummy replacements for less sensitive PII, and apply encryption for medical records. Would you like me to adjust your policies?",
    metadata: { action: "policy" }
  },
  {
    trigger: ["batch", "process", "multiple"],
    response: "For batch processing, I suggest enabling auto-approval for high-confidence detections (95%+) and setting up parallel processing streams. This can reduce processing time by 60%.",
    metadata: { action: "optimization" }
  },
  {
    trigger: ["security", "compliance", "hipaa"],
    response: "Your current security score is 98%. For HIPAA compliance, ensure PHI redaction policies are set to 'anonymize' and audit logging is enabled. Memory-only processing is already active.",
    metadata: { confidence: 98, action: "security" }
  },
  {
    trigger: ["help", "guide", "how"],
    response: "I can help with: 1) Optimizing redaction policies 2) Improving detection accuracy 3) Setting up batch processing 4) Ensuring compliance 5) Reviewing security settings. What specific area interests you?",
    suggestions: ["Policy optimization", "Accuracy tuning", "Compliance check", "Security review"]
  }
];

interface ChatAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const ChatAssistant = ({ isOpen, onToggle }: ChatAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const getAIResponse = (userMessage: string): Message => {
    const lowercaseMessage = userMessage.toLowerCase();
    
    const matchedResponse = aiResponses.find(response =>
      response.trigger.some(trigger => lowercaseMessage.includes(trigger))
    );

    if (matchedResponse) {
      return {
        id: Date.now().toString(),
        type: 'ai',
        content: matchedResponse.response,
        timestamp: new Date(),
        suggestions: matchedResponse.suggestions,
        metadata: matchedResponse.metadata
      };
    }

    // Default response
    return {
      id: Date.now().toString(),
      type: 'ai',
      content: "I understand you're asking about document redaction. Let me help you with that. Could you be more specific about what aspect you'd like assistance with?",
      timestamp: new Date(),
      suggestions: ["PII detection help", "Policy guidance", "Processing tips", "Security advice"]
    };
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const aiResponse = getAIResponse(inputMessage);
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputMessage(suggestion);
    handleSendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-glow hover:shadow-neural z-50"
        variant="neural"
      >
        <Brain className="h-6 w-6 ai-brain" />
      </Button>
    );
  }

  return (
    <Card className={cn(
      "fixed bottom-6 right-6 w-96 glass-card border-primary/30 shadow-glow z-50 transition-all duration-300",
      isMinimized ? "h-16" : "h-[600px]"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Brain className="h-6 w-6 text-primary ai-brain" />
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg" />
            </div>
            <div>
              <CardTitle className="font-cyber text-lg">AI Assistant</CardTitle>
              <CardDescription className="text-xs">
                Redaction & Security Expert
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 p-0"
            >
              {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <div className="flex items-center space-x-2 pt-2">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            <span className="text-xs font-cyber text-accent">Neural Networks Active</span>
            <Badge variant="outline" className="text-xs border-primary text-primary">
              v2.1
            </Badge>
          </div>
        )}
      </CardHeader>

      {!isMinimized && (
        <CardContent className="flex flex-col h-[500px] p-0">
          {/* Messages Area */}
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.type === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-3 text-sm",
                      message.type === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground border border-card-border"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Metadata badges */}
                    {message.metadata && (
                      <div className="flex items-center space-x-2 mt-2">
                        {message.metadata.confidence && (
                          <Badge variant="outline" className="text-xs">
                            {message.metadata.confidence}% confidence
                          </Badge>
                        )}
                        {message.metadata.action && (
                          <Badge variant="outline" className="text-xs">
                            {message.metadata.action}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Suggestions */}
                    {message.suggestions && (
                      <div className="mt-3 space-y-1">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 w-full justify-start bg-background/50 hover:bg-primary/20"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <Sparkles className="h-3 w-3 mr-2" />
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted text-foreground rounded-lg p-3 border border-card-border">
                    <div className="flex items-center space-x-1">
                      <Brain className="h-4 w-4 text-primary animate-pulse" />
                      <span className="text-sm">AI is thinking...</span>
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-card-border p-4">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about redaction policies, PII detection..."
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isTyping}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                variant="neural"
                size="sm"
                className="h-9 w-9 p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground text-center">
              AI-powered assistance for secure document redaction
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};