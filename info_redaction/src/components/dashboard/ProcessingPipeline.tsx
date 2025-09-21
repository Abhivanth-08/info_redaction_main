import { useState, useEffect } from "react";
import { Brain, FileText, Search, Shield, Download, CheckCircle, Clock, Zap, AlertTriangle, Eye, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { apiService, ProcessingJob } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface ProcessingStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress: number;
  icon: any;
  metrics?: {
    itemsProcessed?: number;
    totalItems?: number;
    accuracy?: number;
    detectedPII?: number;
  };
}

const initialSteps: ProcessingStep[] = [
  {
    id: 'parse',
    title: 'Document Parsing',
    description: 'Extracting text and visual elements using Docling AI',
    status: 'pending',
    progress: 0,
    icon: FileText,
    metrics: { itemsProcessed: 0, totalItems: 0 }
  },
  {
    id: 'detect',
    title: 'PII/PHI Detection',
    description: 'Neural networks scanning for sensitive information',
    status: 'pending',
    progress: 0,
    icon: Search,
    metrics: { itemsProcessed: 0, totalItems: 0, detectedPII: 0 }
  },
  {
    id: 'generate',
    title: 'Generate Replacement Data',
    description: 'LangChain AI generating realistic dummy data for detected PII',
    status: 'pending',
    progress: 0,
    icon: Brain,
    metrics: { accuracy: 0 }
  },
  {
    id: 'textpdf',
    title: 'Create Text PDF',
    description: 'Generating text-only PDF for coordinate mapping',
    status: 'pending',
    progress: 0,
    icon: FileText,
    metrics: { itemsProcessed: 0, totalItems: 0 }
  },
  {
    id: 'map',
    title: 'Map PII Spans',
    description: 'Mapping detected PII to PDF coordinates',
    status: 'pending',
    progress: 0,
    icon: Target,
    metrics: { itemsProcessed: 0, totalItems: 0 }
  },
  {
    id: 'redact',
    title: 'Secure Redaction',
    description: 'Applying policy-based redaction strategies',
    status: 'pending',
    progress: 0,
    icon: Shield,
    metrics: { itemsProcessed: 0, totalItems: 0 }
  },
  {
    id: 'save',
    title: 'Save Output',
    description: 'Saving final redacted document',
    status: 'pending',
    progress: 0,
    icon: Download,
    metrics: { itemsProcessed: 0, totalItems: 0 }
  },
  {
    id: 'overlay',
    title: 'Create Overlay',
    description: 'Generating redaction overlay PDF',
    status: 'pending',
    progress: 0,
    icon: Eye,
    metrics: { itemsProcessed: 0, totalItems: 0 }
  }
];

interface ProcessingPipelineProps {
  isActive: boolean;
  onComplete?: () => void;
  jobId?: string | null;
}

export const ProcessingPipeline = ({ isActive, onComplete, jobId }: ProcessingPipelineProps) => {
  const [steps, setSteps] = useState<ProcessingStep[]>(initialSteps);
  const [currentStep, setCurrentStep] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState<ProcessingJob | null>(null);
  const [processingStarted, setProcessingStarted] = useState(false);
  const { toast } = useToast();

  // Start processing when component becomes active
  useEffect(() => {
    if (!isActive || !jobId || processingStarted) return;

    const startProcessing = async () => {
      try {
        setProcessingStarted(true);
        
        // Start the processing job
        await apiService.processDocument(jobId, {
          create_overlay: true,
          user_replacement_choice: 'text_box'
        });
        
        toast({
          title: "Processing Started",
          description: "Your document is being processed by our AI pipeline",
        });
      } catch (err) {
        toast({
          title: "Processing Failed",
          description: err instanceof Error ? err.message : "Failed to start processing",
          variant: "destructive",
        });
      }
    };

    startProcessing();
  }, [isActive, jobId, processingStarted, toast]);

  // Poll job status when processing
  useEffect(() => {
    if (!isActive || !jobId || !processingStarted) return;

    const pollInterval = setInterval(async () => {
      try {
        const job = await apiService.getJobStatus(jobId);
        setJobStatus(job);
        
        // Update progress based on job status
        if (job.status === "completed") {
          setOverallProgress(100);
          setSteps(prev => prev.map(step => ({
            ...step,
            status: 'completed',
            progress: 100
          })));
          clearInterval(pollInterval);
          setTimeout(() => {
            onComplete?.();
          }, 1000);
        } else if (job.status === "failed") {
          setSteps(prev => prev.map(step => ({
            ...step,
            status: 'error'
          })));
          clearInterval(pollInterval);
          toast({
            title: "Processing Failed",
            description: job.error || "Processing failed",
            variant: "destructive",
          });
        } else if (job.status === "processing") {
          // Update progress and current step based on job progress
          setOverallProgress(job.progress);
          
          // Map progress to specific steps based on backend workflow (8 steps)
          let currentStepIndex = 0;
          let stepProgress = 0;
          const stepSize = 100 / 8; // 12.5% per step
          
          if (job.progress <= stepSize) {
            currentStepIndex = 0; // Document Parsing
            stepProgress = (job.progress / stepSize) * 100;
          } else if (job.progress <= stepSize * 2) {
            currentStepIndex = 1; // PII/PHI Detection
            stepProgress = ((job.progress - stepSize) / stepSize) * 100;
          } else if (job.progress <= stepSize * 3) {
            currentStepIndex = 2; // Generate Replacement Data
            stepProgress = ((job.progress - stepSize * 2) / stepSize) * 100;
          } else if (job.progress <= stepSize * 4) {
            currentStepIndex = 3; // Create Text PDF
            stepProgress = ((job.progress - stepSize * 3) / stepSize) * 100;
          } else if (job.progress <= stepSize * 5) {
            currentStepIndex = 4; // Map PII Spans
            stepProgress = ((job.progress - stepSize * 4) / stepSize) * 100;
          } else if (job.progress <= stepSize * 6) {
            currentStepIndex = 5; // Secure Redaction
            stepProgress = ((job.progress - stepSize * 5) / stepSize) * 100;
          } else if (job.progress <= stepSize * 7) {
            currentStepIndex = 6; // Save Output
            stepProgress = ((job.progress - stepSize * 6) / stepSize) * 100;
          } else {
            currentStepIndex = 7; // Create Overlay
            stepProgress = ((job.progress - stepSize * 7) / stepSize) * 100;
          }
          
          setCurrentStep(currentStepIndex);
          
          // Update step statuses with real workflow
          setSteps(prev => prev.map((step, index) => {
            if (index < currentStepIndex) {
              return { ...step, status: 'completed', progress: 100 };
            } else if (index === currentStepIndex) {
              return { ...step, status: 'active', progress: stepProgress };
            } else {
              return { ...step, status: 'pending', progress: 0 };
            }
          }));
        }
      } catch (err) {
        console.error("Error polling job status:", err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [isActive, jobId, processingStarted, steps.length, toast, onComplete]);

  useEffect(() => {
    const completed = steps.filter(s => s.status === 'completed').length;
    setOverallProgress((completed / steps.length) * 100);
  }, [steps]);

  const handleDownload = async (filename: string) => {
    try {
      await apiService.downloadAndSaveFile(filename);
      toast({
        title: "Download Started",
        description: `Downloading ${filename}`,
      });
    } catch (err) {
      toast({
        title: "Download Failed",
        description: err instanceof Error ? err.message : "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const updateMetrics = (step: ProcessingStep, stepIndex: number, progress: number = 100) => {
    const baseMetrics = step.metrics || {};
    
    switch (stepIndex) {
      case 0: // Document Parsing
        return {
          ...baseMetrics,
          itemsProcessed: Math.floor((progress / 100) * (baseMetrics.totalItems || 0))
        };
      case 1: // PII Detection
        return {
          ...baseMetrics,
          itemsProcessed: Math.floor((progress / 100) * (baseMetrics.totalItems || 0)),
          detectedPII: Math.floor((progress / 100) * 0) // Real detected PII count from backend
        };
      case 2: // Classification
        return {
          ...baseMetrics,
          accuracy: Math.min(100, 0 + (progress / 100) * 100) // Real accuracy from backend
        };
      case 3: // Redaction
        const totalToRedact = 0; // Real count from backend
        return {
          ...baseMetrics,
          itemsProcessed: Math.floor((progress / 100) * totalToRedact),
          totalItems: totalToRedact
        };
      default:
        return baseMetrics;
    }
  };

  if (!isActive) return null;

  return (
    <Card className="glass-card border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="h-6 w-6 text-primary ai-brain" />
            <div>
              <CardTitle className="font-cyber text-lg">AI Processing Pipeline</CardTitle>
              <CardDescription>Secure PII/PHI redaction in progress</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="border-primary text-primary">
            {Math.round(overallProgress)}% Complete
          </Badge>
        </div>
        
        <div className="mt-4">
          <Progress value={overallProgress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.status === 'active';
          const isCompleted = step.status === 'completed';
          
          return (
            <div
              key={step.id}
              className={`p-4 rounded-lg border transition-all duration-300 ${
                isActive ? 'border-primary bg-primary/5 shadow-glow' :
                isCompleted ? 'border-accent bg-accent/5' :
                'border-card-border'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    isActive ? 'bg-primary/20 text-primary' :
                    isCompleted ? 'bg-accent/20 text-accent' :
                    'bg-muted/20 text-muted-foreground'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : isActive ? (
                      <Icon className={`h-5 w-5 ${isActive ? 'animate-pulse' : ''}`} />
                    ) : (
                      <Clock className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div>
                    <h4 className="font-cyber font-semibold text-sm">{step.title}</h4>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                
                <div className="text-right text-xs">
                  {step.status === 'active' && (
                    <div className="flex items-center space-x-2 text-primary">
                      <Zap className="h-3 w-3 animate-pulse" />
                      <span>Processing...</span>
                    </div>
                  )}
                  {step.status === 'completed' && (
                    <span className="text-accent font-medium">✓ Complete</span>
                  )}
                </div>
              </div>

              {(isActive || isCompleted) && step.progress > 0 && (
                <div className="mb-3">
                  <Progress value={step.progress} className="h-1" />
                </div>
              )}

              {/* Metrics Display */}
              {step.metrics && (isActive || isCompleted) && (
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  {step.metrics.itemsProcessed !== undefined && step.metrics.totalItems !== undefined && (
                    <span>
                      Items: {step.metrics.itemsProcessed}/{step.metrics.totalItems}
                    </span>
                  )}
                  {step.metrics.detectedPII !== undefined && step.metrics.detectedPII > 0 && (
                    <span className="text-destructive">
                      PII Found: {step.metrics.detectedPII}
                    </span>
                  )}
                  {step.metrics.accuracy !== undefined && step.metrics.accuracy > 0 && (
                    <span className="text-accent">
                      Accuracy: {step.metrics.accuracy.toFixed(1)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {overallProgress === 100 && jobStatus?.result_files && (
          <div className="mt-6 p-4 bg-accent/10 border border-accent/30 rounded-lg">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="h-6 w-6 text-accent" />
              <div>
                <h4 className="font-cyber font-semibold text-accent">Processing Complete!</h4>
                <p className="text-sm text-muted-foreground">
                  Your document has been securely processed and is ready for review.
                </p>
                {jobId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Job ID: {jobId}
                  </p>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-cyber font-semibold text-sm">Available Files:</h5>
                <Button
                  onClick={() => {
                    // Store current job ID for document viewer
                    if (jobId) {
                      localStorage.setItem('currentJobId', jobId);
                    }
                    window.location.href = '/viewer';
                  }}
                  variant="ai"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>View Document</span>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {jobStatus.result_files.map((filename, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(filename)}
                    className="flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>{filename}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {jobStatus?.status === "failed" && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <div>
                <h4 className="font-cyber font-semibold text-red-500">Processing Failed</h4>
                <p className="text-sm text-muted-foreground">
                  {jobStatus.error || "An error occurred during processing"}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};