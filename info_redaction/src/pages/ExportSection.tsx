import { useState, useEffect } from "react";
import { Download, Eye, ArrowLeft, FileText, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface DocumentFiles {
  inputPdf?: string;
  overlayPdf?: string;
  redactedPdf?: string;
  logFile?: string;
}

export const ExportSection = () => {
  const [currentJob, setCurrentJob] = useState<string | null>(null);
  const [documentFiles, setDocumentFiles] = useState<DocumentFiles>({});
  const [piiSpans, setPiiSpans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Get the current job from localStorage
    const jobId = localStorage.getItem('currentJobId');
    if (jobId) {
      setCurrentJob(jobId);
      loadDocumentFiles(jobId);
    }
  }, []);

  const loadDocumentFiles = async (jobId: string) => {
    setIsLoading(true);
    try {
      const jobStatus = await apiService.getJobStatus(jobId);
      if (jobStatus.result_files) {
        const files: DocumentFiles = {};
        jobStatus.result_files.forEach(filename => {
          if (filename.includes('redacted')) {
            files.redactedPdf = filename;
          } else if (filename.includes('overlay')) {
            files.overlayPdf = filename;
          } else if (filename.includes('log')) {
            files.logFile = filename;
          }
        });
        setDocumentFiles(files);
        
        // Load PII spans from log file if available
        if (files.logFile) {
          loadPiiSpans(files.logFile);
        }
      }
    } catch (error) {
      toast({
        title: "Error Loading Documents",
        description: "Failed to load document files",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPiiSpans = async (logFilename: string) => {
    try {
      // Use fetch directly to get the log data without triggering download
      const response = await fetch(`http://localhost:8000/download/${logFilename}`);
      if (response.ok) {
        const logText = await response.text();
        const logData = JSON.parse(logText);
        
        if (logData.redactions) {
          setPiiSpans(logData.redactions);
        }
      }
    } catch (error) {
      console.error("Error loading PII spans:", error);
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      await apiService.downloadAndSaveFile(filename);
      toast({
        title: "Download Started",
        description: `Downloading ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const getPdfUrl = (filename: string) => {
    return `http://localhost:8000/download/${filename}`;
  };

  return (
    <div className="neural-bg min-h-screen">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-3xl font-cyber font-bold bg-gradient-primary bg-clip-text text-transparent">
                Export & Comparison
              </h1>
              <p className="text-muted-foreground">
                Download processed documents and view comparisons
              </p>
            </div>
          </div>
          
          {currentJob && (
            <Badge variant="outline" className="font-cyber">
              Job ID: {currentJob}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <Zap className="h-12 w-12 text-primary mx-auto animate-pulse" />
              <p className="text-muted-foreground">Loading documents...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Document Files */}
            <Card className="glass-card border-primary/30">
              <CardHeader>
                <CardTitle className="font-cyber text-lg flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Available Documents</span>
                </CardTitle>
                <CardDescription>
                  Download your processed documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {documentFiles.redactedPdf && (
                    <div className="p-4 border border-card-border rounded-lg space-y-3">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-accent" />
                        <span className="font-medium">Redacted Document</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Final document with PII redacted
                      </p>
                      <Button
                        variant="ai"
                        size="sm"
                        onClick={() => handleDownload(documentFiles.redactedPdf!)}
                        className="w-full space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </Button>
                    </div>
                  )}
                  
                  {documentFiles.overlayPdf && (
                    <div className="p-4 border border-card-border rounded-lg space-y-3">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-5 w-5 text-secondary" />
                        <span className="font-medium">Overlay Document</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Visual overlay showing redaction areas
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(documentFiles.overlayPdf!)}
                        className="w-full space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </Button>
                    </div>
                  )}
                  
                  {documentFiles.logFile && (
                    <div className="p-4 border border-card-border rounded-lg space-y-3">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="font-medium">Processing Log</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Detailed processing information
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(documentFiles.logFile!)}
                        className="w-full space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>Download</span>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Show Comparison Button */}
            {documentFiles.inputPdf && documentFiles.redactedPdf && (
              <div className="flex justify-center">
                <Button
                  onClick={() => setShowComparison(!showComparison)}
                  variant="ai"
                  size="lg"
                  className="h-16 px-8 space-x-3"
                >
                  <Eye className="h-6 w-6" />
                  <span className="text-lg font-cyber">
                    {showComparison ? 'Hide' : 'Show'} Comparison
                  </span>
                </Button>
              </div>
            )}

            {/* Side-by-Side Comparison */}
            {showComparison && documentFiles.inputPdf && documentFiles.redactedPdf && (
              <Card className="glass-card border-accent/30">
                <CardHeader>
                  <CardTitle className="font-cyber text-lg flex items-center space-x-2">
                    <Eye className="h-5 w-5 text-accent" />
                    <span>Side-by-Side Comparison</span>
                  </CardTitle>
                  <CardDescription>
                    Compare input and redacted documents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-cyber font-semibold mb-2 flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span>Input Document</span>
                      </h4>
                      <div className="w-full h-[500px] border border-card-border rounded-lg overflow-hidden">
                        <iframe
                          src={getPdfUrl(documentFiles.inputPdf!)}
                          className="w-full h-full"
                          title="Input PDF"
                        />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-cyber font-semibold mb-2 flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-accent" />
                        <span>Redacted Document</span>
                      </h4>
                      <div className="w-full h-[500px] border border-card-border rounded-lg overflow-hidden">
                        <iframe
                          src={getPdfUrl(documentFiles.redactedPdf!)}
                          className="w-full h-full"
                          title="Redacted PDF"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PII Spans */}
            {piiSpans.length > 0 && (
              <Card className="glass-card border-secondary/30">
                <CardHeader>
                  <CardTitle className="font-cyber text-lg flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-secondary" />
                    <span>Detected PII Spans</span>
                  </CardTitle>
                  <CardDescription>
                    All PII instances that were detected and redacted
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {piiSpans.map((span, index) => (
                      <div key={index} className="p-3 bg-muted/50 rounded-lg border border-card-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {span.type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Page {span.page}
                            </span>
                          </div>
                          <Badge 
                            variant={span.action === 'anonymize' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {span.action}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Original: </span>
                            <span className="font-medium">{span.original}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Replacement: </span>
                            <span className="font-medium text-accent">{span.replacement}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};