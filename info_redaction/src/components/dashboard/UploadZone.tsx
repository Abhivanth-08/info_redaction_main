import { useState, useRef } from "react";
import { Upload, File, Image, Brain, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiService, UploadResponse, ProcessingJob } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface UploadZoneProps {
  onFileUpload: (jobId: string, response: UploadResponse) => void;
}

export const UploadZone = ({ onFileUpload }: UploadZoneProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showAIDetection, setShowAIDetection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Only process the first file for now
    const file = files[0];
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadStatus('error');
      setUploadMessage('Only PDF files are supported');
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setUploadStatus('error');
      setUploadMessage('File size must be less than 10MB');
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Store the file and show AI detection button
    setUploadedFile(file);
    setUploadStatus('success');
    setUploadMessage(`File "${file.name}" ready for AI detection`);
    setShowAIDetection(true);
    
    toast({
      title: "File Ready",
      description: `File "${file.name}" uploaded successfully. Click AI Detection to start processing.`,
    });
  };

  const handleAIDetection = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setUploadStatus('uploading');
    setUploadMessage('Starting AI detection...');

    try {
      const response = await apiService.uploadFile(uploadedFile);
      setUploadStatus('success');
      setUploadMessage(`AI detection started! Job ID: ${response.job_id}`);
      
      toast({
        title: "AI Detection Started",
        description: `Processing "${uploadedFile.name}" with AI pipeline`,
      });

      onFileUpload(response.job_id, response);
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error instanceof Error ? error.message : 'AI detection failed');
      
      toast({
        title: "AI Detection Failed",
        description: error instanceof Error ? error.message : 'An error occurred during AI detection',
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer group",
          isDragOver
            ? "border-primary bg-primary/5 shadow-glow"
            : "border-card-border hover:border-primary/50 hover:bg-primary/2",
          isProcessing && "pointer-events-none opacity-60"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-6">
          {isProcessing ? (
            <div className="flex flex-col items-center space-y-4">
              {uploadStatus === 'success' ? (
                <CheckCircle className="h-16 w-16 text-green-500" />
              ) : uploadStatus === 'error' ? (
                <AlertCircle className="h-16 w-16 text-red-500" />
              ) : (
                <Brain className="h-16 w-16 text-primary ai-brain" />
              )}
              <div className="space-y-2">
                <h3 className="text-xl font-cyber font-semibold text-primary">
                  {uploadStatus === 'success' ? 'Upload Complete!' : 
                   uploadStatus === 'error' ? 'Upload Failed' : 'Uploading...'}
                </h3>
                <p className="text-muted-foreground text-center">
                  {uploadMessage || 'Processing your file...'}
                </p>
              </div>
              {uploadStatus !== 'error' && (
                <div className="neural-line w-64 h-0.5 bg-muted rounded-full" />
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <Upload className="h-16 w-16 text-primary group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-cyber font-semibold">
                  Upload Documents for AI Analysis
                </h3>
                <p className="text-muted-foreground">
                  Drag and drop your PDFs or images here, or click to browse
                </p>
              </div>

              <div className="flex items-center justify-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <File className="h-4 w-4" />
                  <span>PDF</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Image className="h-4 w-4" />
                  <span>JPG, PNG</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Neural network animation overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="w-full h-full bg-gradient-neural animate-neural-pulse rounded-xl" />
        </div>
      </div>

      {/* AI Detection Button */}
      {showAIDetection && (
        <div className="flex justify-center">
          <Button 
            onClick={handleAIDetection}
            disabled={isProcessing}
            variant="ai" 
            size="lg"
            className="h-16 px-8 space-x-3"
          >
            <Brain className="h-6 w-6" />
            <span className="text-lg font-cyber">Start AI Detection</span>
          </Button>
        </div>
      )}
    </div>
  );
};