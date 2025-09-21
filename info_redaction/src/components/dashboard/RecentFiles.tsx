import { File, Eye, Download, Trash2, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileItem {
  id: string;
  name: string;
  type: "pdf" | "image";
  status: "completed" | "processing" | "pending";
  piiCount: number;
  redactedCount: number;
  uploadDate: string;
  size: string;
}

const mockFiles: FileItem[] = [
  {
    id: "1",
    name: "employee_records_2024.pdf",
    type: "pdf",
    status: "completed",
    piiCount: 45,
    redactedCount: 42,
    uploadDate: "2024-01-15T10:30:00Z",
    size: "2.4 MB"
  },
  {
    id: "2", 
    name: "customer_data_analysis.pdf",
    type: "pdf",
    status: "processing",
    piiCount: 23,
    redactedCount: 15,
    uploadDate: "2024-01-15T09:15:00Z",
    size: "1.8 MB"
  },
  {
    id: "3",
    name: "form_submission.png",
    type: "image", 
    status: "pending",
    piiCount: 0,
    redactedCount: 0,
    uploadDate: "2024-01-15T08:45:00Z",
    size: "856 KB"
  }
];

export const RecentFiles = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-accent";
      case "processing":
        return "text-primary";
      case "pending":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-accent/20 text-accent border-accent/30";
      case "processing":
        return "bg-primary/20 text-primary border-primary/30 animate-pulse";
      case "pending":
        return "bg-muted/20 text-muted-foreground border-muted/30";
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-cyber font-bold">Recent Files</h2>
        <Button variant="ai" size="sm">
          View All
        </Button>
      </div>

      <div className="space-y-4">
        {mockFiles.map((file) => (
          <div
            key={file.id}
            className="glass-card p-6 hover-glow group transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {/* File Icon */}
                <div className="relative">
                  <File className="h-10 w-10 text-primary" />
                  <div className="absolute inset-0 bg-primary/20 rounded blur-sm" />
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {file.name}
                    </h3>
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-xs font-cyber border",
                        getStatusBadge(file.status)
                      )}
                    >
                      {file.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(file.uploadDate)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <File className="h-3 w-3" />
                      <span>{file.size}</span>
                    </div>
                    {file.status !== "pending" && (
                      <div className="flex items-center space-x-1">
                        <Shield className="h-3 w-3" />
                        <span>
                          {file.redactedCount}/{file.piiCount} PII redacted
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button variant="ai" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
                {file.status === "completed" && (
                  <Button variant="cyber" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Progress Bar for processing files */}
            {file.status === "processing" && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>AI Processing...</span>
                  <span>{Math.round((file.redactedCount / file.piiCount) * 100)}%</span>
                </div>
                <div className="w-full bg-muted/20 rounded-full h-2">
                  <div
                    className="bg-gradient-primary h-2 rounded-full neural-line"
                    style={{ width: `${(file.redactedCount / file.piiCount) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {mockFiles.length === 0 && (
        <div className="text-center py-12">
          <File className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No files uploaded yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Upload your first document to start AI-powered PII detection
          </p>
        </div>
      )}
    </div>
  );
};