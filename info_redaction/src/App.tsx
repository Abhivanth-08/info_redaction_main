import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "@/components/layout/Navigation";
import { ChatAssistant } from "@/components/ai/ChatAssistant";
import { Dashboard } from "./pages/Dashboard";
import Index from "./pages/Index";
import { DocumentViewer } from "./pages/DocumentViewer";
import { HistoryLogs } from "./pages/HistoryLogs";
import { ExportSection } from "./pages/ExportSection";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground">
            <Navigation />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/viewer" element={<DocumentViewer />} />
              <Route path="/history" element={<HistoryLogs />} />
              <Route path="/export" element={<ExportSection />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ChatAssistant 
              isOpen={isChatOpen} 
              onToggle={() => setIsChatOpen(!isChatOpen)} 
            />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
