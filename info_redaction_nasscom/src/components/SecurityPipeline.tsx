import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Settings, Shield, Download, CheckCircle2, AlertCircle, FileX, Layers, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import heroImage from '@/assets/cyberpunk-hero.jpg';
import { redactDocument, downloadServerFile } from '@/lib/api';

type ProcessingState = 'configure' | 'processing' | 'results';
type TextRedactionMode = 'dummy' | 'anonymize';
type VisualRedactionMode = 'textbox' | 'replacement';

interface ProcessingStep {
  id: string;
  title: string;
  status: 'pending' | 'active' | 'complete';
  icon: React.ReactNode;
}

interface RedactionResults {
  totalRedactions: number;
  piiTypes: string[];
  visualElements: number;
  breakdown: { type: string; count: number }[];
}

interface BackendSession {
  sessionId: string;
  files: Record<string, string>; // keys: redacted, log, overlay?
}

const SecurityPipeline = () => {
  const [state, setState] = useState<ProcessingState>('configure');
  const [file, setFile] = useState<File | null>(null);
  const [textMode, setTextMode] = useState<TextRedactionMode>('dummy');
  const [visualMode, setVisualRedactionMode] = useState<VisualRedactionMode>('textbox');
  const [createOverlay, setCreateOverlay] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState<RedactionResults | null>(null);
  const [session, setSession] = useState<BackendSession | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const processingSteps: ProcessingStep[] = [
    { id: 'start', title: 'Starting Redaction Pipeline...', status: 'pending', icon: <Shield className="w-5 h-5" /> },
    { id: 'parse', title: 'Parsing document structure...', status: 'pending', icon: <FileText className="w-5 h-5" /> },
    { id: 'detect', title: 'Detecting PII and PHI...', status: 'pending', icon: <Eye className="w-5 h-5" /> },
    { id: 'generate', title: 'Generating replacement data...', status: 'pending', icon: <Settings className="w-5 h-5" /> },
    { id: 'redact', title: 'Applying secure text redaction...', status: 'pending', icon: <FileX className="w-5 h-5" /> },
    { id: 'visual', title: 'Processing visual elements...', status: 'pending', icon: <Layers className="w-5 h-5" /> },
    { id: 'complete', title: 'Complete!', status: 'pending', icon: <CheckCircle2 className="w-5 h-5" /> },
  ];

  const handleFileUpload = (uploadedFile: File) => {
    if (uploadedFile.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF document only.",
        variant: "destructive",
      });
      return;
    }
    setFile(uploadedFile);
    toast({
      title: "File uploaded successfully",
      description: `${uploadedFile.name} is ready for processing.`,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileUpload(droppedFile);
  };

  const startRedaction = async () => {
    if (!file) return;

    setState('processing');

    // Kick off a UI progress animation in parallel to the backend call
    const stepTimings = [500, 1200, 2000, 1500, 1800, 1000, 300];
    let cancelled = false;
    const progressLoop = (async () => {
      for (let i = 0; i < processingSteps.length && !cancelled; i++) {
        setCurrentStep(i);
        setProgress(((i + 1) / processingSteps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, stepTimings[i]));
      }
    })();

    try {
      const resp = await redactDocument({
        file,
        text_redaction_mode: textMode,
        visual_redaction_mode: visualMode,
        create_overlay_pdf: createOverlay,
      });

      cancelled = true; // stop the progress animation loop
      setProgress(100);
      setCurrentStep(processingSteps.length - 1);

      setSession({ sessionId: resp.session_id, files: resp.files });

      // Map log_summary to our UI metrics if possible
      const summary: any = resp.log_summary || {};
      const total = summary.total_redactions || summary.total || summary.count || 0;
      const breakdownArr: { type: string; count: number }[] = Array.isArray(summary.breakdown)
        ? summary.breakdown.map((b: any) => ({ type: String(b.type ?? b.label ?? 'Unknown'), count: Number(b.count ?? 0) }))
        : Array.isArray(summary.types)
          ? summary.types.map((t: any) => ({ type: String(t.name ?? t.type ?? 'Unknown'), count: Number(t.count ?? 0) }))
          : [];
      const piiTypes = breakdownArr.map(b => b.type);
      const visualElements = Number(summary.visual_elements ?? summary.visual ?? 0);

      setResults({
        totalRedactions: Number(total) || breakdownArr.reduce((s, b) => s + (b.count || 0), 0),
        piiTypes,
        visualElements,
        breakdown: breakdownArr,
      });

      setState('results');
      toast({
        title: 'Redaction Complete',
        description: 'Your document has been securely processed and is ready for download.',
      });
    } catch (err: any) {
      cancelled = true;
      console.error(err);
      toast({
        title: 'Processing failed',
        description: err?.message || 'An unexpected error occurred while processing the document.',
        variant: 'destructive',
      });
      // Return to configure state but keep file so user can retry
      setState('configure');
      setProgress(0);
      setCurrentStep(0);
    }
  };

  const resetPipeline = () => {
    setState('configure');
    setFile(null);
    setProgress(0);
    setCurrentStep(0);
    setResults(null);
    setSession(null);
  };

  if (state === 'configure') {
    return (
  <div className="min-h-screen bg-gradient-dark font-rajdhani text-white">
        {/* Cyberpunk Hero Section */}
        <div className="relative bg-gradient-cyber overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <img 
              src={heroImage} 
              alt="Cyberpunk Security Interface" 
              className="w-full h-full object-cover"
            />
          </div>
          {/* Animated data streams */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-neon opacity-50 animate-data-flow"></div>
            <div className="absolute top-3/4 right-0 w-full h-px bg-gradient-primary opacity-30 animate-data-flow" style={{animationDelay: '1s'}}></div>
          </div>
          <div className="relative container mx-auto px-6 py-20">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="font-orbitron text-6xl font-bold mb-8 text-primary animate-neon-pulse">
                SECURE REDACTION MATRIX
              </h1>
              <p className="text-xl text-foreground/90 mb-12 font-rajdhani">
                Advanced neural-net document processing with quantum-grade encryption protocols.
                <br />
                <span className="text-primary">Initialize security matrices and deploy redaction algorithms.</span>
              </p>
              <div className="flex items-center justify-center gap-12 text-sm">
                <div className="flex items-center gap-3 group">
                  <div className="p-2 rounded-full bg-primary/20 border border-primary group-hover:shadow-glow-primary transition-glow">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <span className="font-medium">QUANTUM SECURITY</span>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="p-2 rounded-full bg-success/20 border border-success group-hover:shadow-glow-success transition-glow">
                    <Eye className="w-6 h-6 text-success" />
                  </div>
                  <span className="font-medium">NEURAL TRANSPARENCY</span>
                </div>
                <div className="flex items-center gap-3 group">
                  <div className="p-2 rounded-full bg-warning/20 border border-warning group-hover:shadow-glow-warning transition-glow">
                    <CheckCircle2 className="w-6 h-6 text-warning" />
                  </div>
                  <span className="font-medium">BLOCKCHAIN AUDIT</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cyberpunk Interface Grid */}
        <div className="container mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            
            {/* File Upload Terminal */}
            <Card className="shadow-deep border border-glass-border bg-glass backdrop-blur-xl">
              <CardHeader className="border-b border-glass-border">
                <CardTitle className="flex items-center gap-3 font-orbitron text-primary">
                  <div className="p-2 rounded-full bg-primary/20 border border-primary animate-pulse-glow">
                    <Upload className="w-5 h-5" />
                  </div>
                  DOCUMENT UPLOAD TERMINAL
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center transition-glow cursor-pointer relative overflow-hidden
                    ${file 
                      ? 'border-success bg-success/10 shadow-glow-success backdrop-blur-sm' 
                      : 'border-primary/50 bg-primary/5 hover:bg-primary/10 hover:border-primary hover:shadow-glow-soft'
                    }
                  `}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    className="hidden"
                  />
                  
                  {file ? (
                    <div className="space-y-6 relative">
                      <div className="absolute inset-0 bg-gradient-success opacity-10 animate-hologram rounded-lg"></div>
                      <CheckCircle2 className="w-16 h-16 mx-auto text-success animate-pulse-glow" />
                      <div>
                        <p className="font-orbitron font-bold text-success text-lg">{file.name}</p>
                        <p className="text-sm text-muted-foreground font-rajdhani">
                          {(file.size / 1024 / 1024).toFixed(2)} MB • ENCRYPTED PDF MATRIX
                        </p>
                      </div>
                      <Button 
                        variant="cyber" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                      >
                        PURGE FILE
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="relative">
                        <FileText className="w-16 h-16 mx-auto text-primary animate-pulse" />
                        <div className="absolute inset-0 w-16 h-16 mx-auto border border-primary/30 rounded-lg animate-pulse-glow"></div>
                      </div>
                      <div>
                        <p className="font-orbitron font-bold text-lg">DEPLOY SECURE MATRIX</p>
                        <p className="text-sm text-muted-foreground font-rajdhani">
                          Initialize document upload protocol
                        </p>
                      </div>
                      <Button variant="cyber" size="sm">
                        ACCESS TERMINAL
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Neural Redaction Control Center */}
            <Card className="shadow-deep border border-glass-border bg-glass backdrop-blur-xl">
              <CardHeader className="border-b border-glass-border">
                <CardTitle className="flex items-center gap-3 font-orbitron text-primary">
                  <div className="p-2 rounded-full bg-primary/20 border border-primary animate-pulse-glow">
                    <Settings className="w-5 h-5" />
                  </div>
                  NEURAL REDACTION MATRIX
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 p-8">
                
                {/* Text Protocol Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-orbitron font-bold text-primary">TEXT PROTOCOL MATRIX</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setTextMode('dummy')}
                      className={`
                        p-6 rounded-lg border-2 text-left transition-glow relative overflow-hidden backdrop-blur-sm
                        ${textMode === 'dummy' 
                          ? 'border-success bg-success/20 shadow-glow-success' 
                          : 'border-glass-border bg-glass hover:bg-success/10 hover:border-success/50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${textMode === 'dummy' ? 'bg-success border-success shadow-glow-success' : 'border-glass-border'}`} />
                        <span className="font-orbitron font-bold text-sm">DUMMY SYNTHESIS</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-rajdhani">
                        Neural-generated realistic data replacement protocols
                      </p>
                      {textMode === 'dummy' && (
                        <div className="absolute inset-0 bg-gradient-success opacity-10 animate-hologram"></div>
                      )}
                    </button>
                    
                    <button
                      onClick={() => setTextMode('anonymize')}
                      className={`
                        p-6 rounded-lg border-2 text-left transition-glow relative overflow-hidden backdrop-blur-sm
                        ${textMode === 'anonymize' 
                          ? 'border-warning bg-warning/20 shadow-glow-warning' 
                          : 'border-glass-border bg-glass hover:bg-warning/10 hover:border-warning/50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-4 h-4 rounded-full border-2 ${textMode === 'anonymize' ? 'bg-warning border-warning shadow-glow-warning' : 'border-glass-border'}`} />
                        <span className="font-orbitron font-bold text-sm">CIPHER ANONYMIZE</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-rajdhani">
                        Quantum placeholder tag encryption system
                      </p>
                      {textMode === 'anonymize' && (
                        <div className="absolute inset-0 bg-gradient-warning opacity-10 animate-hologram"></div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Visual Redaction Mode */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Visual Redaction Mode</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setVisualRedactionMode('textbox')}
                      className={`
                        p-4 rounded-lg border-2 text-left transition-all
                        ${visualMode === 'textbox' 
                          ? 'border-primary bg-primary/20 text-white' 
                          : 'border-border bg-card hover:bg-muted text-muted-foreground'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${visualMode === 'textbox' ? 'bg-primary' : 'bg-muted'}`} />
                        <span className="font-semibold">Text Box</span>
                      </div>
                      <p className="text-sm">
                        Covers images with descriptive labels
                      </p>
                    </button>
                    
                    <button
                      onClick={() => setVisualRedactionMode('replacement')}
                      className={`
                        p-4 rounded-lg border-2 text-left transition-all
                        ${visualMode === 'replacement' 
                          ? 'border-primary bg-primary/20 text-white' 
                          : 'border-border bg-card hover:bg-muted text-muted-foreground'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full ${visualMode === 'replacement' ? 'bg-primary' : 'bg-muted'}`} />
                        <span className="font-semibold">Image Replacement</span>
                      </div>
                      <p className="text-sm">
                        Replaces with contextually similar images
                      </p>
                    </button>
                  </div>
                </div>

                {/* Audit & Verification */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Audit & Verification</Label>
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
                    <div>
                      <p className="font-medium">Generate Audit Overlay PDF</p>
                      <p className="text-sm text-muted-foreground">
                        Creates a visual map of all redactions for review
                      </p>
                    </div>
                    <Switch 
                      checked={createOverlay} 
                      onCheckedChange={setCreateOverlay}
                    />
                  </div>
                </div>

                {/* Deploy Button */}
                <Button
                  onClick={startRedaction}
                  disabled={!file}
                  className="w-full font-orbitron font-bold text-lg py-8 bg-gradient-neon hover:shadow-neon transition-glow relative overflow-hidden"
                  size="lg"
                >
                  <div className="absolute inset-0 bg-gradient-primary opacity-0 hover:opacity-20 transition-glow"></div>
                  <Shield className="w-6 h-6 mr-3 animate-pulse" />
                  INITIALIZE REDACTION MATRIX
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'processing') {
    return (
  <div className="min-h-screen bg-gradient-dark flex items-center justify-center font-rajdhani text-white">
        <Card className="w-full max-w-3xl mx-6 shadow-deep border border-glass-border bg-glass backdrop-blur-xl relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-cyber opacity-50"></div>
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-neon animate-data-flow"></div>
          <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-primary animate-data-flow" style={{animationDelay: '1.5s'}}></div>
          
          <CardHeader className="text-center relative z-10 border-b border-glass-border">
            <CardTitle className="text-3xl flex items-center justify-center gap-4 font-orbitron text-primary">
              <div className="p-3 rounded-full bg-primary/20 border border-primary animate-pulse-glow">
                <Shield className="w-8 h-8 animate-pulse" />
              </div>
              NEURAL PROCESSING MATRIX
            </CardTitle>
            <p className="text-muted-foreground font-rajdhani text-lg mt-4">
              Deploying quantum encryption algorithms and neural redaction protocols
            </p>
          </CardHeader>
          <CardContent className="space-y-8 p-8 relative z-10">
            <div className="relative">
              <Progress value={progress} className="h-3 bg-muted/20 border border-primary/30" />
              <div className="absolute inset-0 bg-gradient-primary opacity-30 h-3 rounded-full animate-pulse" style={{width: `${progress}%`}}></div>
            </div>
            
            <div className="space-y-4">
              {processingSteps.map((step, index) => (
                <div 
                  key={step.id}
                  className={`
                    flex items-center gap-4 p-4 rounded-lg transition-glow relative overflow-hidden backdrop-blur-sm
                    ${index <= currentStep 
                      ? 'bg-primary/20 border border-primary/50 shadow-glow-soft' 
                      : 'bg-muted/10 border border-glass-border'
                    }
                  `}
                >
                  <div className={`
                    p-2 rounded-full border transition-glow
                    ${index < currentStep 
                      ? 'text-success bg-success/20 border-success shadow-glow-success' 
                      : index === currentStep 
                        ? 'text-primary bg-primary/20 border-primary animate-pulse-glow' 
                        : 'text-muted-foreground bg-muted/10 border-glass-border'
                    }
                  `}>
                    {step.icon}
                  </div>
                  <span className={`
                    font-rajdhani font-medium text-lg
                    ${index <= currentStep ? 'text-foreground' : 'text-white/300'}
                  `}>
                    {step.title}
                  </span>
                  {index < currentStep && (
                    <CheckCircle2 className="w-5 h-5 text-success ml-auto animate-pulse-glow" />
                  )}
                  {index <= currentStep && (
                    <div className="absolute inset-0 bg-gradient-primary opacity-10 animate-hologram"></div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'results' && results) {
    return (
  <div className="min-h-screen bg-gradient-subtle text-white">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-6xl mx-auto">
            
            {/* Success Header */}
            <div className="text-center mb-8">
              <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Redaction Complete</h1>
              <p className="text-muted-foreground">
                Your document has been securely processed with full transparency
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              
              {/* Document Preview Section */}
              <Card className="shadow-medium">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    Document Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-8 text-center">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      Side-by-side document comparison would appear here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Interactive preview with hover highlighting
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Results & Downloads */}
              <div className="space-y-6">
                
                {/* Summary Stats */}
                <Card className="shadow-medium">
                  <CardHeader>
                    <CardTitle>Redaction Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-accent rounded-lg">
                        <div className="text-2xl font-bold text-primary">{results.totalRedactions}</div>
                        <div className="text-sm text-muted-foreground">Total Redactions</div>
                      </div>
                      <div className="text-center p-4 bg-accent rounded-lg">
                        <div className="text-2xl font-bold text-primary">{results.piiTypes.length}</div>
                        <div className="text-sm text-muted-foreground">PII Types Found</div>
                      </div>
                      <div className="text-center p-4 bg-accent rounded-lg">
                        <div className="text-2xl font-bold text-primary">{results.visualElements}</div>
                        <div className="text-sm text-muted-foreground">Visual Elements</div>
                      </div>
                    </div>

                    {/* PII Breakdown */}
                    <div className="space-y-3">
                      <h4 className="font-semibold">PII Types Detected</h4>
                      {results.breakdown.map((item) => (
                        <div key={item.type} className="flex items-center justify-between">
                          <span className="text-sm">{item.type}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Download Center */}
                <Card className="shadow-medium">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="w-5 h-5" />
                      Download Center
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={async () => {
                        if (!session) return;
                        try {
                          const base = file?.name?.replace(/\.pdf$/i, '') || 'document';
                          await downloadServerFile(session.sessionId, 'redacted', `${base} redacted.pdf`);
                        } catch (e: any) {
                          toast({ title: 'Download failed', description: e?.message || 'Unable to download file.', variant: 'destructive' });
                        }
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Download Redacted PDF
                    </Button>
                    {session?.files.overlay && (
                      <Button
                        className="w-full justify-start"
                        variant="outline"
                        onClick={async () => {
                          if (!session || !session.files.overlay) {
                            toast({ title: 'Overlay unavailable', description: 'No overlay was generated for this session.' });
                            return;
                          }
                          try {
                            const base = file?.name?.replace(/\.pdf$/i, '') || 'document';
                            await downloadServerFile(session.sessionId, 'overlay', `${base} overlay.pdf`);
                          } catch (e: any) {
                            toast({ title: 'Download failed', description: e?.message || 'Unable to download overlay.', variant: 'destructive' });
                          }
                        }}
                      >
                        <Layers className="w-4 h-4 mr-2" />
                        Download Audit Overlay
                      </Button>
                    )}
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={async () => {
                        if (!session) return;
                        try {
                          await downloadServerFile(session.sessionId, 'log', 'redaction_log.json');
                        } catch (e: any) {
                          toast({ title: 'Download failed', description: e?.message || 'Unable to download log.', variant: 'destructive' });
                        }
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Download JSON Log
                    </Button>
                    <Button
                      className="w-full justify-start"
                      onClick={async () => {
                        if (!session) return;
                        // Build an object URL for the originally uploaded file to view side-by-side
                        let originalUrl: string | undefined = undefined;
                        if (file) {
                          try {
                            originalUrl = URL.createObjectURL(file);
                          } catch {}
                        }
                        navigate('/viewer', { state: { sessionId: session.sessionId, originalUrl, originalName: file?.name } });
                      }}
                    >
                      View Side-by-Side Comparison
                    </Button>
                  </CardContent>
                </Card>

                {/* Reset Button */}
                <Button 
                  onClick={resetPipeline}
                  variant="outline" 
                  className="w-full"
                >
                  Process Another Document
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SecurityPipeline;