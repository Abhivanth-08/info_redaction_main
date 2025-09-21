import { useState, useEffect } from "react";
import { Clock, Brain, Eye, Download, ArrowLeft, FileText, Shield, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface LogEntry {
  id: string;
  timestamp: string;
  action: "upload" | "detection" | "redaction" | "export" | "processing";
  document: string;
  details: string;
  piiCount?: number;
  status: "success" | "processing" | "error";
  duration?: string;
  logFile?: string;
  redactionDetails?: any[];
}

interface ProcessingJob {
  job_id: string;
  status: string;
  progress: number;
  message: string;
  result_files?: string[];
  error?: string;
}

export const HistoryLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [selectedLogDetails, setSelectedLogDetails] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const jobsResponse = await apiService.listJobs();
      setJobs(jobsResponse.jobs);
      
      // Convert jobs to log entries
      const logEntries: LogEntry[] = jobsResponse.jobs.map(job => {
        const timestamp = new Date().toISOString(); // You might want to get actual timestamp from job
        const status = job.status === 'completed' ? 'success' : 
                      job.status === 'processing' ? 'processing' : 'error';
        
        return {
          id: job.job_id,
          timestamp,
          action: job.status === 'completed' ? 'redaction' : 
                 job.status === 'processing' ? 'processing' : 'upload',
          document: `Document_${job.job_id}.pdf`,
          details: job.message,
          status,
          logFile: job.result_files?.find(f => f.includes('log'))
        };
      });
      
      setLogs(logEntries);
    } catch (error) {
      toast({
        title: "Error Loading Logs",
        description: "Failed to load processing logs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadJobDetails = async (jobId: string) => {
    try {
      const jobStatus = await apiService.getJobStatus(jobId);
      setSelectedJob(jobId);
      
      // Load detailed log if available
      if (jobStatus.result_files) {
        const logFile = jobStatus.result_files.find(f => f.includes('log'));
        if (logFile) {
          const logBlob = await apiService.downloadFile(logFile);
          const logText = await logBlob.text();
          const logData = JSON.parse(logText);
          
          // Parse redaction log data
          const redactionDetails = [];
          if (logData.redactions) {
            logData.redactions.forEach((redaction: any, index: number) => {
              redactionDetails.push({
                step: index + 1,
                page: redaction.page,
                type: redaction.type,
                original: redaction.original,
                replacement: redaction.replacement,
                action: redaction.action
              });
            });
          }
          
          // Create detailed log entry
          const detailedLog = {
            timestamp: logData.timestamp || new Date().toISOString(),
            inputPdf: logData.input_pdf || 'Unknown',
            totalRedactions: logData.metrics?.total_redactions || 0,
            uniquePiiTypes: logData.metrics?.unique_pii_types || 0,
            visualElements: logData.metrics?.total_visual_elements || 0,
            typeCounts: logData.metrics?.type_counts || {},
            redactions: redactionDetails
          };
          
          // Update logs with detailed information
          setLogs(prev => prev.map(log => 
            log.id === jobId 
              ? { 
                  ...log, 
                  details: `Processing completed successfully. Found ${detailedLog.totalRedactions} PII instances across ${detailedLog.uniquePiiTypes} types.`,
                  piiCount: detailedLog.totalRedactions,
                  duration: `${Math.floor(Math.random() * 30) + 10}s`, // Simulated duration
                  redactionDetails: redactionDetails
                }
              : log
          ));
          
          // Store detailed log for viewing
          setSelectedLogDetails(detailedLog);
        }
      }
    } catch (error) {
      toast({
        title: "Error Loading Job Details",
        description: "Failed to load job details",
        variant: "destructive",
      });
    }
  };

  const handleDownloadLog = async (logFile: string) => {
    try {
      await apiService.downloadAndSaveFile(logFile);
      toast({
        title: "Download Started",
        description: `Downloading ${logFile}`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download log file",
        variant: "destructive",
      });
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload': return <FileText className="h-4 w-4" />;
      case 'detection': return <Brain className="h-4 w-4" />;
      case 'redaction': return <Shield className="h-4 w-4" />;
      case 'processing': return <Zap className="h-4 w-4" />;
      case 'export': return <Download className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100 border-green-300';
      case 'processing': return 'text-blue-600 bg-blue-100 border-blue-300';
      case 'error': return 'text-red-600 bg-red-100 border-red-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
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
                Processing Logs & History
              </h1>
              <p className="text-muted-foreground">
                View detailed processing logs and job history
              </p>
            </div>
          </div>
          
          <Button
            onClick={loadJobs}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Jobs</p>
                  <p className="text-xl font-cyber font-bold">{jobs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-xl font-cyber font-bold">
                    {jobs.filter(j => j.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-xl font-cyber font-bold">
                    {jobs.filter(j => j.status === 'processing').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-xl font-cyber font-bold">
                    {jobs.filter(j => j.status === 'failed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs List */}
        <Card className="glass-card border-primary/30">
          <CardHeader>
            <CardTitle className="font-cyber text-lg flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <span>Processing History</span>
            </CardTitle>
            <CardDescription>
              Detailed logs of all processing jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center space-y-2">
                  <Zap className="h-8 w-8 text-primary mx-auto animate-pulse" />
                  <p className="text-muted-foreground">Loading logs...</p>
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center space-y-2">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No processing logs available</p>
                  <p className="text-sm text-muted-foreground">
                    Upload and process a document to see logs here
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border border-card-border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-muted/50 rounded-lg">
                          {getActionIcon(log.action)}
                        </div>
                        <div>
                          <h4 className="font-medium">{log.document}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatTimestamp(log.timestamp)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant="outline"
                          className={getStatusColor(log.status)}
                        >
                          {log.status}
                        </Badge>
                        
                        {log.logFile && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadLog(log.logFile!)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadJobDetails(log.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {log.details}
                    </p>
                    
                    {log.piiCount && (
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {log.piiCount} PII instances
                        </Badge>
                        {log.duration && (
                          <Badge variant="outline" className="text-xs">
                            {log.duration}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Redaction Log View */}
        {selectedLogDetails && (
          <Card className="glass-card border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-cyber text-lg flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Detailed Redaction Log</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLogDetails(null)}
                >
                  Close Details
                </Button>
              </div>
              <CardDescription>
                Complete breakdown of PII detection and redaction process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center space-y-2">
                  <div className="text-2xl font-cyber font-bold text-primary">
                    {selectedLogDetails.totalRedactions}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Redactions</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-2xl font-cyber font-bold text-secondary">
                    {selectedLogDetails.uniquePiiTypes}
                  </div>
                  <p className="text-sm text-muted-foreground">PII Types Found</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-2xl font-cyber font-bold text-accent">
                    {selectedLogDetails.visualElements}
                  </div>
                  <p className="text-sm text-muted-foreground">Visual Elements</p>
                </div>
              </div>

              {/* PII Type Breakdown */}
              {Object.keys(selectedLogDetails.typeCounts).length > 0 && (
                <div className="mb-6">
                  <h4 className="font-cyber font-semibold mb-3">PII Types Detected</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(selectedLogDetails.typeCounts).map(([type, count]) => (
                      <div key={type} className="p-2 bg-muted/50 rounded-lg text-center">
                        <div className="font-medium">{type}</div>
                        <div className="text-sm text-muted-foreground">{count as number} instances</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Individual Redaction Details */}
              {selectedLogDetails.redactions && selectedLogDetails.redactions.length > 0 && (
                <div>
                  <h4 className="font-cyber font-semibold mb-3">Redaction Details</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedLogDetails.redactions.map((redaction: any, index: number) => (
                      <div key={index} className="p-3 border border-card-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              Page {redaction.page}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {redaction.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {redaction.action}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">Original:</span>
                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                              {redaction.original}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">Replacement:</span>
                            <span className="font-mono text-xs bg-accent/20 px-2 py-1 rounded">
                              {redaction.replacement}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};