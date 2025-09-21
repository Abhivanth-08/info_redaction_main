import { useState, useEffect } from "react";
import { ArrowLeft, Download, Eye, FileText, Shield, Zap } from "lucide-react";
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

export const DocumentViewer = () => {
  const [currentJob, setCurrentJob] = useState<string | null>(null);
  const [documentFiles, setDocumentFiles] = useState<DocumentFiles>({});
  const [selectedView, setSelectedView] = useState<'input' | 'overlay' | 'redacted'>('input');
  const [piiSpans, setPiiSpans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Get the current job from localStorage or URL params
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
        
        // The input PDF is the original uploaded file, stored in uploads directory
        // We'll construct the filename - the backend stores it as {job_id}_{original_filename}
        // For now, we'll use a generic approach and let the backend handle the actual filename
        files.inputPdf = `${jobId}_input.pdf`;
        
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
    // Check if it's an input PDF (original uploaded file)
    if (filename.includes('_input')) {
      // For input PDFs, use the new input endpoint
      const jobId = filename.replace('_input.pdf', '');
      return `http://localhost:8000/input/${jobId}`;
    }
    return `http://localhost:8000/download/${filename}`;
  };

  const handlePdfView = (filename: string) => {
    const url = getPdfUrl(filename);
    window.open(url, '_blank');
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
                Document Viewer
              </h1>
              <p className="text-muted-foreground">
                View and compare processed documents
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Document Selection Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="glass-card border-primary/30">
                <CardHeader>
                  <CardTitle className="font-cyber text-lg flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span>Documents</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant={selectedView === 'input' ? 'ai' : 'outline'}
                    className="w-full justify-start space-x-2"
                    onClick={() => setSelectedView('input')}
                    disabled={!documentFiles.inputPdf}
                  >
                    <Eye className="h-4 w-4" />
                    <span>Input PDF</span>
                  </Button>
                  
                  <Button
                    variant={selectedView === 'overlay' ? 'ai' : 'outline'}
                    className="w-full justify-start space-x-2"
                    onClick={() => setSelectedView('overlay')}
                    disabled={!documentFiles.overlayPdf}
                  >
                    <Shield className="h-4 w-4" />
                    <span>Overlay PDF</span>
                  </Button>
                  
                  <Button
                    variant={selectedView === 'redacted' ? 'ai' : 'outline'}
                    className="w-full justify-start space-x-2"
                    onClick={() => setSelectedView('redacted')}
                    disabled={!documentFiles.redactedPdf}
                  >
                    <Zap className="h-4 w-4" />
                    <span>Redacted PDF</span>
                  </Button>
                  
                  {documentFiles.inputPdf && documentFiles.redactedPdf && (
                    <Button
                      variant={showComparison ? 'ai' : 'outline'}
                      className="w-full justify-start space-x-2"
                      onClick={() => setShowComparison(!showComparison)}
                    >
                      <Eye className="h-4 w-4" />
                      <span>Show Comparison</span>
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* PII Spans */}
              {piiSpans.length > 0 && (
                <Card className="glass-card border-secondary/30">
                  <CardHeader>
                    <CardTitle className="font-cyber text-lg flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-secondary" />
                      <span>Detected PII</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {piiSpans.map((span, index) => (
                        <div key={index} className="p-2 bg-muted/50 rounded-lg">
                          <div className="text-sm font-medium">{span.type}</div>
                          <div className="text-xs text-muted-foreground">
                            Page {span.page} • {span.original}
                          </div>
                          <div className="text-xs text-accent">
                            → {span.replacement}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* PDF Viewer */}
            <div className="lg:col-span-3">
              {showComparison ? (
                <Card className="glass-card border-accent/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-cyber text-lg flex items-center space-x-2">
                          <Eye className="h-5 w-5 text-accent" />
                          <span>Side-by-Side Comparison</span>
                        </CardTitle>
                        <CardDescription>
                          Compare input and redacted documents
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowComparison(false)}
                      >
                        Close Comparison
                      </Button>
                    </div>
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
                            src={`${getPdfUrl(documentFiles.inputPdf!)}#toolbar=1&navpanes=1&scrollbar=1`}
                            className="w-full h-full"
                            title="Input PDF"
                          />
                        </div>
                        <div className="mt-2 flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(documentFiles.inputPdf!)}
                            className="flex items-center space-x-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download Input</span>
                          </Button>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-cyber font-semibold mb-2 flex items-center space-x-2">
                          <Zap className="h-4 w-4 text-accent" />
                          <span>Redacted Document</span>
                        </h4>
                        <div className="w-full h-[500px] border border-card-border rounded-lg overflow-hidden">
                          <iframe
                            src={`${getPdfUrl(documentFiles.redactedPdf!)}#toolbar=1&navpanes=1&scrollbar=1`}
                            className="w-full h-full"
                            title="Redacted PDF"
                          />
                        </div>
                        <div className="mt-2 flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(documentFiles.redactedPdf!)}
                            className="flex items-center space-x-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download Redacted</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="glass-card border-primary/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-cyber text-lg">
                          {selectedView === 'input' && 'Input Document'}
                          {selectedView === 'overlay' && 'Redaction Overlay'}
                          {selectedView === 'redacted' && 'Redacted Document'}
                        </CardTitle>
                        <CardDescription>
                          {selectedView === 'input' && 'Original uploaded document'}
                          {selectedView === 'overlay' && 'Visual overlay showing redaction areas'}
                          {selectedView === 'redacted' && 'Final processed document with PII redacted'}
                        </CardDescription>
                      </div>
                      
                      {(() => {
                        const filename = selectedView === 'input' ? documentFiles.inputPdf :
                                        selectedView === 'overlay' ? documentFiles.overlayPdf :
                                        documentFiles.redactedPdf;
                        return filename ? (
                          <Button
                            variant="ai"
                            size="sm"
                            onClick={() => handleDownload(filename)}
                            className="space-x-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </Button>
                        ) : null;
                      })()}
                    </div>
                  </CardHeader>
                <CardContent>
                  <div className="w-full h-[600px] border border-card-border rounded-lg overflow-hidden">
                    {(() => {
                      const filename = selectedView === 'input' ? documentFiles.inputPdf :
                                      selectedView === 'overlay' ? documentFiles.overlayPdf :
                                      documentFiles.redactedPdf;
                      
                      if (!filename) {
                        return (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center space-y-4">
                              <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
                              <div>
                                <p className="text-lg font-medium">No document available</p>
                                <p className="text-sm text-muted-foreground">
                                  This document type is not available for the current job
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="w-full h-full flex flex-col">
                          <div className="flex items-center justify-between p-4 border-b border-card-border">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-5 w-5 text-primary" />
                              <span className="font-medium">{filename}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePdfView(filename)}
                                className="flex items-center space-x-2"
                              >
                                <Eye className="h-4 w-4" />
                                <span>Open in New Tab</span>
                              </Button>
                              <Button
                                variant="ai"
                                size="sm"
                                onClick={() => handleDownload(filename)}
                                className="flex items-center space-x-2"
                              >
                                <Download className="h-4 w-4" />
                                <span>Download</span>
                              </Button>
                            </div>
                          </div>
                          <div className="flex-1">
                            <iframe
                              src={`${getPdfUrl(filename)}#toolbar=1&navpanes=1&scrollbar=1`}
                              className="w-full h-full"
                              title={`${selectedView} PDF`}
                              onError={() => {
                                console.error('PDF failed to load, trying alternative method');
                              }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};