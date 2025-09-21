import { useState } from "react";
import { UploadZone } from "@/components/dashboard/UploadZone";
import { RecentFiles } from "@/components/dashboard/RecentFiles";
import { ProcessingPipeline } from "@/components/dashboard/ProcessingPipeline";
import { PolicyManager } from "@/components/dashboard/PolicyManager";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { Brain, Shield, Zap, Users, Activity, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UploadResponse, ProcessingJob } from "@/services/api";
import heroImage from "@/assets/ai-brain-hero.jpg";

const stats = [
  {
    title: "Documents Processed",
    value: "0",
    change: "0%",
    icon: Shield,
  },
  {
    title: "PII Detected",
    value: "0",
    change: "0%",
    icon: Brain,
  },
  {
    title: "AI Accuracy",
    value: "0%",
    change: "0%",
    icon: Zap,
  },
  {
    title: "Processing Jobs",
    value: "0",
    change: "0%",
    icon: Users,
  },
];

export const Dashboard = () => {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<ProcessingJob | null>(null);
  const [activeTab, setActiveTab] = useState("policies");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (jobId: string, response: UploadResponse) => {
    setCurrentJobId(jobId);
    localStorage.setItem('currentJobId', jobId);
    setIsProcessing(true);
    // Automatically switch to pipeline tab after successful upload
    setTimeout(() => {
      setActiveTab("pipeline");
    }, 1000);
  };

  const handleProcessingComplete = () => {
    setIsProcessing(false);
    setActiveTab("analytics");
  };

  return (
    <div className="neural-bg min-h-screen">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative glass-card rounded-2xl overflow-hidden border border-card-border">
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt="AI Brain Neural Network"
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/60" />
          </div>
          
          <div className="relative p-12">
            <div className="max-w-2xl">
              <div className="flex items-center space-x-3 mb-6">
                <Brain className="h-12 w-12 text-primary ai-brain" />
                <div>
                  <h1 className="text-4xl font-cyber font-bold bg-gradient-primary bg-clip-text text-transparent">
                    AI PII Redactor
                  </h1>
                  <p className="text-lg text-muted-foreground font-inter">
                    Futuristic Document Protection System
                  </p>
                </div>
              </div>
              
              <p className="text-xl text-foreground mb-8 leading-relaxed">
                Advanced AI-powered detection and redaction of personally identifiable information 
                from your documents. Experience the future of data privacy protection.
              </p>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-accent">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  <span className="font-cyber">Neural Networks Active</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-primary">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span className="font-cyber">AI Processing Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="glass-card p-6 hover-glow group transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <Icon className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
                  <span className="text-sm font-cyber text-accent bg-accent/10 px-2 py-1 rounded-full">
                    {stat.change}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-cyber font-bold text-foreground mb-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stat.title}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Enhanced Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-4 bg-card/50 backdrop-blur-sm">
              <TabsTrigger value="policies" className="font-cyber text-xs">
                Policies
              </TabsTrigger>
              <TabsTrigger value="upload" className="font-cyber text-xs">
                Upload
              </TabsTrigger>
              <TabsTrigger value="pipeline" className="font-cyber text-xs">
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="analytics" className="font-cyber text-xs">
                Analytics
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center space-x-2">
              <Button variant="ai" size="sm">
                <Settings className="h-4 w-4" />
                Quick Setup
              </Button>
            </div>
          </div>

          <TabsContent value="policies" className="space-y-6">
            <PolicyManager />
          </TabsContent>

          <TabsContent value="upload" className="space-y-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-cyber font-bold mb-2">
                  Upload & Process
                </h2>
                <p className="text-muted-foreground">
                  Upload your documents for AI-powered PII detection and redaction
                </p>
              </div>
              
              <UploadZone onFileUpload={handleFileUpload} />
            </div>

            {/* AI Capabilities Section */}
            <div className="glass-card p-8 border border-card-border">
              <h2 className="text-2xl font-cyber font-bold text-center mb-8">
                AI Capabilities
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <Brain className="h-12 w-12 text-primary mx-auto ai-brain" />
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg" />
                  </div>
                  <h3 className="font-cyber font-semibold text-lg">Smart Detection</h3>
                  <p className="text-sm text-muted-foreground">
                    Advanced neural networks identify PII with high accuracy using Docling AI
                  </p>
                </div>
                
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <Shield className="h-12 w-12 text-secondary mx-auto animate-pulse" />
                    <div className="absolute inset-0 bg-secondary/20 rounded-full blur-lg" />
                  </div>
                  <h3 className="font-cyber font-semibold text-lg">Secure Processing</h3>
                  <p className="text-sm text-muted-foreground">
                    Memory-only processing with policy-based redaction strategies
                  </p>
                </div>
                
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <Zap className="h-12 w-12 text-accent mx-auto animate-pulse" />
                    <div className="absolute inset-0 bg-accent/20 rounded-full blur-lg" />
                  </div>
                  <h3 className="font-cyber font-semibold text-lg">LangChain AI</h3>
                  <p className="text-sm text-muted-foreground">
                    Intelligent dummy data generation and entity classification
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-6">
            <ProcessingPipeline 
              isActive={isProcessing} 
              onComplete={handleProcessingComplete}
              jobId={currentJobId}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};