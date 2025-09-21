import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getFileBlobUrl } from '@/lib/api';
import { Layers, ArrowLeft, FileText } from 'lucide-react';

// Simple PDF embedder using <iframe>. For production, pdf.js could be used for richer controls.

type LocationState = {
  sessionId: string;
  originalUrl?: string; // optional object URL for original input if available
  originalName?: string; // optional original filename for naming downloads
};

const Viewer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const [redactedUrl, setRedactedUrl] = useState<string>('');
  const [overlayUrl, setOverlayUrl] = useState<string>('');
  const [originalUrl, setOriginalUrl] = useState<string>(state.originalUrl || '');
  const [error, setError] = useState<string>('');
  const [originalName, setOriginalName] = useState<string>(state.originalName || 'document.pdf');

  const sessionId = state.sessionId;

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!sessionId) {
        setError('Missing session id.');
        return;
      }
      try {
        const redacted = await getFileBlobUrl(sessionId, 'redacted');
        if (!mounted) return;
        setRedactedUrl(redacted);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load redacted document.');
      }
      try {
        const overlay = await getFileBlobUrl(sessionId, 'overlay');
        if (!mounted) return;
        setOverlayUrl(overlay);
      } catch {
        // overlay optional; ignore errors
      }
    })();
    return () => {
      mounted = false;
      if (redactedUrl) URL.revokeObjectURL(redactedUrl);
      if (overlayUrl) URL.revokeObjectURL(overlayUrl);
      // originalUrl is provided by caller; avoid revoking it here, caller owns it.
    };
  }, [sessionId]);

  const columns = useMemo(() => (overlayUrl ? 'lg:grid-cols-3' : 'lg:grid-cols-2'), [overlayUrl]);
  const baseName = useMemo(() => originalName.replace(/\.pdf$/i, ''), [originalName]);
  const download = (blobUrl: string, name: string) => {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="min-h-screen bg-gradient-dark text-white">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigate('/')}> 
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Button>
          <h1 className="text-xl font-semibold">Document Comparison</h1>
          <div className="flex gap-2">
            {originalUrl && (
              <Button variant="outline" onClick={() => download(originalUrl!, `${baseName}.pdf`)}>
                <FileText className="w-4 h-4 mr-2" /> Download Original
              </Button>
            )}
            {redactedUrl && (
              <Button variant="outline" onClick={() => download(redactedUrl, `${baseName} redacted.pdf`)}>
                <FileText className="w-4 h-4 mr-2" /> Download Redacted
              </Button>
            )}
            {overlayUrl && (
              <Button variant="outline" onClick={() => download(overlayUrl, `${baseName} overlay.pdf`)}>
                <FileText className="w-4 h-4 mr-2" /> Download Overlay
              </Button>
            )}
          </div>
        </div>

        {error && (
          <Card className="mb-4">
            <CardContent className="p-4 text-red-500">{error}</CardContent>
          </Card>
        )}

        <div className={`grid ${columns} gap-6`}>
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" /> Original Input
              </CardTitle>
            </CardHeader>
            <CardContent>
              {originalUrl ? (
                <iframe title="original" src={originalUrl} className="w-full h-[75vh] rounded border" />
              ) : (
                <div className="p-6 text-sm text-gray-600">Original document URL not provided. Return to home and re-upload to view original.</div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" /> Redacted Output
              </CardTitle>
            </CardHeader>
            <CardContent>
              {redactedUrl ? (
                <iframe title="redacted" src={redactedUrl} className="w-full h-[75vh] rounded border" />
              ) : (
                <div className="p-6 text-sm text-gray-600">Loading redacted PDF…</div>
              )}
            </CardContent>
          </Card>

          {!!overlayUrl && (
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" /> Audit Overlay
                </CardTitle>
              </CardHeader>
              <CardContent>
                <iframe title="overlay" src={overlayUrl} className="w-full h-[75vh] rounded border" />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Viewer;
