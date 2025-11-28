import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "~/components/Toast";

interface QRIdentifyScannerProps {
  nodes: Array<{
    nodeId: string;
    nodeKey: string;
    title: string;
    url: string;
    isStart: boolean;
    isEnd: boolean;
    adminComment: string | null;
  }>;
  onClose: () => void;
}

type BarcodeDetectorType = {
  detect: (source: HTMLCanvasElement | ImageBitmap) => Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorType;
  }
}

export function QRIdentifyScanner({ nodes, onClose }: QRIdentifyScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [identifiedNode, setIdentifiedNode] = useState<typeof nodes[0] | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetectorType | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  const lastScanAttemptRef = useRef<number>(0);
  const toast = useToast();

  // Minimum time between scan attempts (ms)
  const SCAN_COOLDOWN = 1000;

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const extractNodeKey = useCallback((url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/");
      const nodeIndex = pathParts.findIndex((part) => part === "n");
      if (nodeIndex !== -1 && pathParts[nodeIndex + 1]) {
        return pathParts[nodeIndex + 1];
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const identifyQRCode = useCallback((qrData: string) => {
    // Prevent duplicate processing using ref (synchronous check)
    if (isProcessingRef.current) {
      return false;
    }

    const now = Date.now();
    if (now - lastScanAttemptRef.current < SCAN_COOLDOWN) {
      return false;
    }

    const nodeKey = extractNodeKey(qrData);
    if (nodeKey) {
      isProcessingRef.current = true;
      lastScanAttemptRef.current = now;

      const matchedNode = nodes.find(n => n.nodeKey === nodeKey);
      if (matchedNode) {
        setIdentifiedNode(matchedNode);
        stopCamera();
        toast.success(`Found: ${matchedNode.title}`);
        isProcessingRef.current = false;
        return true;
      } else {
        toast.warning("QR code not found in this game");
        isProcessingRef.current = false;
      }
    }
    return false;
  }, [nodes, extractNodeKey, stopCamera, toast]);

  const scanQRCode = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      animationRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (window.BarcodeDetector && !barcodeDetectorRef.current) {
      try {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: ["qr_code"],
        });
      } catch {
        barcodeDetectorRef.current = null;
      }
    }

    if (barcodeDetectorRef.current) {
      // Skip detection if already processing
      if (isProcessingRef.current) {
        animationRef.current = requestAnimationFrame(scanQRCode);
        return;
      }

      barcodeDetectorRef.current
        .detect(canvas)
        .then((barcodes) => {
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            const qrData = barcodes[0].rawValue;
            if (qrData !== lastScannedRef.current) {
              lastScannedRef.current = qrData;
              if (identifyQRCode(qrData)) {
                return;
              }
            }
          }
          animationRef.current = requestAnimationFrame(scanQRCode);
        })
        .catch(() => {
          animationRef.current = requestAnimationFrame(scanQRCode);
        });
    } else {
      animationRef.current = requestAnimationFrame(scanQRCode);
    }
  }, [identifyQRCode]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setIdentifiedNode(null);
    lastScannedRef.current = null;

    if (!window.isSecureContext) {
      const errorMsg = "Camera requires HTTPS. Please use a secure connection.";
      setCameraError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = "Camera not supported in this browser.";
      setCameraError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setIsScanning(true);
    } catch (err) {
      let errorMsg = "Unable to access camera.";

      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          errorMsg = "Camera permission denied. Please allow camera access and try again.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          errorMsg = "No camera found on this device.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          errorMsg = "Camera is already in use by another application.";
        }
      }

      setCameraError(errorMsg);
      toast.error(errorMsg);
    }
  }, [toast]);

  useEffect(() => {
    // Auto-start camera when component mounts
    startCamera();
    return () => {
      stopCamera();
    };
  }, [stopCamera, startCamera]);

  useEffect(() => {
    if (isScanning && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;

      video.onloadedmetadata = () => {
        video.play()
          .then(() => {
            toast.info("Scanner ready! Point at a QR code");
            animationRef.current = requestAnimationFrame(scanQRCode);
          })
          .catch((err) => {
            console.error("Failed to play video:", err);
            setCameraError("Failed to start video playback");
            toast.error("Failed to start video playback");
          });
      };

      video.onerror = () => {
        setCameraError("Video failed to load");
        toast.error("Video failed to load");
      };
    }
  }, [isScanning, scanQRCode, toast]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-3 sm:p-4">
      <div className="rounded-lg max-w-[500px] w-full max-h-[90vh] overflow-y-auto shadow-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <div className="flex justify-between items-center p-4 border-b border-border" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <h3 className="m-0 text-base sm:text-lg font-semibold text-primary">Identify QR Code</h3>
          <button onClick={onClose} className="bg-transparent border-0 text-2xl cursor-pointer text-muted hover:text-primary p-0 leading-none transition-colors min-h-[2.5rem] min-w-[2.5rem] flex items-center justify-center" aria-label="Close">
            &times;
          </button>
        </div>

        <div className="p-4">
          {cameraError && (
            <div className="flex items-center gap-3 p-4 mb-4 bg-error/10 text-error border border-error/20 rounded-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span className="text-sm font-medium">{cameraError}</span>
            </div>
          )}

          {identifiedNode ? (
            <div className="text-center animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-success/10 text-success">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-primary mb-2">QR Code Identified!</h4>
              <div className="p-4 rounded-lg border mb-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-xl font-bold text-primary mb-2">{identifiedNode.title}</p>
                <div className="flex justify-center gap-2">
                  {identifiedNode.isStart && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/30">
                      Start
                    </span>
                  )}
                  {identifiedNode.isEnd && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-info/15 text-info border border-info/30">
                      End
                    </span>
                  )}
                </div>
                {identifiedNode.adminComment && (
                  <p className="text-sm text-secondary mt-3 italic bg-warning/10 px-3 py-2 rounded-lg">
                    📝 {identifiedNode.adminComment}
                  </p>
                )}
                <p className="text-xs text-muted mt-3 break-all">{identifiedNode.url}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIdentifiedNode(null);
                    startCamera();
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Scan Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm font-medium text-primary bg-tertiary rounded-lg hover:bg-tertiary/80 transition-colors border border-border"
                >
                  Close
                </button>
              </div>
            </div>
          ) : isScanning ? (
            <div className="animate-fade-in space-y-4">
              <div className="relative w-full aspect-square max-w-sm mx-auto bg-black rounded-xl overflow-hidden shadow-xl ring-2 ring-[var(--color-primary)]/20">
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Dark overlay with transparent center */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 right-0 h-[15%] bg-black/60" />
                  <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-black/60" />
                  <div className="absolute top-[15%] left-0 w-[15%] bottom-[15%] bg-black/60" />
                  <div className="absolute top-[15%] right-0 w-[15%] bottom-[15%] bg-black/60" />

                  <div className="absolute top-[15%] left-[15%] right-[15%] bottom-[15%]">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-white rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-white rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-white rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-white rounded-br-lg" />
                    <div className="absolute left-2 right-2 h-0.5 bg-[var(--color-primary)] animate-[scan-line_2s_ease-in-out_infinite]" />
                  </div>
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 text-white bg-black/70 backdrop-blur-sm py-2 px-3 rounded-lg z-10">
                  <div className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                  <span className="text-xs font-medium">Point at a QR code to identify</span>
                </div>
              </div>

              <style>{`
                @keyframes scan-line {
                  0%, 100% { top: 0; opacity: 1; }
                  50% { top: calc(100% - 2px); opacity: 0.5; }
                }
              `}</style>

              <button
                onClick={stopCamera}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-error rounded-lg hover:bg-error-dark transition-colors"
              >
                Stop Scanner
              </button>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-primary/10 text-primary">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-primary mb-2">Scan to Identify</h4>
              <p className="text-secondary text-sm mb-4">
                Scan a QR code to see which node it belongs to.
              </p>
              <button
                onClick={startCamera}
                className="w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-primary to-primary-dark rounded-lg hover:opacity-90 transition-all"
              >
                Start Scanner
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
