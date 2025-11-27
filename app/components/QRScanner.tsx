import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "~/components/Loading";
import { useToast } from "~/components/Toast";
import { playCoinSound, playErrorSound, playSuccessSound } from "~/lib/sounds";

interface QRScannerProps {
  gameSlug: string;
  token: string;
}

interface ScanResult {
  success: boolean;
  message: string;
  node?: {
    title: string;
    content: string | null;
    contentType: string;
    mediaUrl: string | null;
  };
  passwordRequired?: boolean;
  isGameComplete?: boolean;
  pointsAwarded?: number;
}

type BarcodeDetectorType = {
  detect: (source: HTMLCanvasElement | ImageBitmap) => Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorType;
  }
}

export function QRScanner({ gameSlug, token, autoStart = false }: QRScannerProps & { autoStart?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [password, setPassword] = useState("");
  const [currentNodeKey, setCurrentNodeKey] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetectorType | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const toast = useToast();
  const hasAutoStartedRef = useRef(false);

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

  const submitScan = useCallback(async (nodeKey: string, pwd?: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/v1/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nodeKey, password: pwd }),
      });

      const result: ScanResult = await response.json();
      setScanResult(result);

      if (result.passwordRequired) {
        setCurrentNodeKey(nodeKey);
        toast.info("This clue requires a password!");
        return;
      }

      if (result.success) {
        // Play coin/success sound
        playSuccessSound();
        if (result.pointsAwarded) {
          setTimeout(() => playCoinSound(), 200);
        }
        toast.success(result.message);
        if (result.pointsAwarded) {
          toast.success(`+${result.pointsAwarded} points!`);
        }
        // Full page reload to fetch new clue data from server
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        playErrorSound();
        toast.error(result.message);
      }
    } catch {
      const errorResult = { success: false, message: "Failed to record scan" };
      setScanResult(errorResult);
      playErrorSound();
      toast.error(errorResult.message);
    } finally {
      setIsProcessing(false);
    }
  }, [token, toast]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentNodeKey && password) {
      await submitScan(currentNodeKey, password);
      setPassword("");
    }
  };

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

    // Initialize BarcodeDetector if available and not already created
    if (window.BarcodeDetector && !barcodeDetectorRef.current) {
      try {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: ["qr_code"],
        });
      } catch {
        // BarcodeDetector not supported
        barcodeDetectorRef.current = null;
      }
    }

    const processBarcode = (qrData: string) => {
      const nodeKey = extractNodeKey(qrData);
      if (nodeKey && nodeKey !== lastScannedRef.current) {
        lastScannedRef.current = nodeKey;
        stopCamera();
        submitScan(nodeKey);
        return true;
      }
      return false;
    };

    if (barcodeDetectorRef.current) {
      barcodeDetectorRef.current
        .detect(canvas)
        .then((barcodes) => {
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            if (processBarcode(barcodes[0].rawValue)) {
              return;
            }
          }
          animationRef.current = requestAnimationFrame(scanQRCode);
        })
        .catch(() => {
          animationRef.current = requestAnimationFrame(scanQRCode);
        });
    } else {
      // BarcodeDetector not available - show helpful message
      // Continue scanning loop, user will need to use manual entry
      animationRef.current = requestAnimationFrame(scanQRCode);
    }
  }, [stopCamera, submitScan, extractNodeKey]);

  const startCamera = useCallback(async () => {
    setError(null);
    setCameraError(null);
    setScanResult(null);
    lastScannedRef.current = null;

    // Check if we're in a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      const errorMsg = "Camera requires HTTPS. Please use a secure connection.";
      setCameraError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Check if getUserMedia is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = "Camera not supported in this browser.";
      setCameraError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      // Try with rear camera first (environment), then fallback to any camera
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
        // Fallback to any available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      // Set isScanning to true FIRST so the video element renders
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
        } else if (err.name === "OverconstrainedError") {
          errorMsg = "Camera doesn't meet requirements. Try a different device.";
        } else if (err.name === "SecurityError") {
          errorMsg = "Camera access blocked due to security settings.";
        }
      }

      setCameraError(errorMsg);
      toast.error(errorMsg);
    }
  }, [toast]);

  useEffect(() => {
    // Auto-start camera if autoStart prop is true
    if (autoStart && !hasAutoStartedRef.current && !isScanning && !scanResult) {
      hasAutoStartedRef.current = true;
      startCamera();
    }
  }, [autoStart, isScanning, scanResult, startCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Attach stream to video element after it renders
  useEffect(() => {
    if (isScanning && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;

      video.onloadedmetadata = () => {
        video.play()
          .then(() => {
            toast.info("Scanner ready! Point at a QR code");
            // Start scanning loop
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

  // Password entry form
  if (scanResult?.passwordRequired && currentNodeKey) {
    return (
      <div className="p-5 sm:p-6 bg-elevated rounded-lg border border-border shadow-sm animate-slide-up">
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full flex-shrink-0 bg-warning/10 text-warning-dark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-6 sm:h-6">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-primary">Password Required</h3>
            {scanResult.node && (
              <p className="text-sm sm:text-base text-muted">{scanResult.node.title}</p>
            )}
          </div>
        </div>
        <form onSubmit={handlePasswordSubmit}>
          <div className="mb-4">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-sm sm:text-base bg-secondary text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[3rem] sm:min-h-[3.5rem]"
              placeholder="Enter password"
              autoFocus
              disabled={isProcessing}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[2.75rem] sm:min-h-[3rem]"
              disabled={isProcessing || !password}
            >
              {isProcessing ? (
                <>
                  <Spinner size="sm" />
                  <span>Checking...</span>
                </>
              ) : (
                "Submit"
              )}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-secondary rounded-lg hover:bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[2.75rem] sm:min-h-[3rem]"
              onClick={() => {
                setScanResult(null);
                setCurrentNodeKey(null);
              }}
              disabled={isProcessing}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Scan result
  if (scanResult && !scanResult.passwordRequired) {
    return (
      <div className="p-5 sm:p-6 bg-elevated rounded-lg border border-border shadow-sm animate-pop-in">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full mb-4 ${scanResult.success ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
            {scanResult.success ? (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-12 sm:h-12">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-12 sm:h-12">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <p className="font-semibold text-base sm:text-lg mt-4 text-primary">
            {scanResult.message}
          </p>
          {scanResult.success && scanResult.pointsAwarded && (
            <div className="mt-3 text-xl sm:text-2xl font-bold text-success animate-pop-in">
              +{scanResult.pointsAwarded} points!
            </div>
          )}
          {scanResult.success && (
            <p className="text-muted mt-2 flex items-center justify-center gap-2 text-sm sm:text-base">
              <Spinner size="sm" />
              Refreshing...
            </p>
          )}
          {!scanResult.success && (
            <button
              className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors min-h-[2.75rem] sm:min-h-[3rem]"
              onClick={() => {
                setScanResult(null);
                startCamera();
              }}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {(error || cameraError) && (
        <div className="flex items-center gap-3 p-4 mb-4 bg-error/10 text-error border border-error/20 rounded-lg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-sm font-medium">{error || cameraError}</span>
        </div>
      )}

      {isScanning ? (
        <div className="animate-fade-in space-y-3 sm:space-y-4">
          {/* Camera Feed - Full width, responsive */}
          <div className="relative w-full aspect-square max-w-md mx-auto bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl ring-2 sm:ring-4 ring-[var(--color-primary)]/20">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Dark overlay with transparent center square */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top dark strip */}
              <div className="absolute top-0 left-0 right-0 h-[15%] bg-black/60" />
              {/* Bottom dark strip */}
              <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-black/60" />
              {/* Left dark strip */}
              <div className="absolute top-[15%] left-0 w-[15%] bottom-[15%] bg-black/60" />
              {/* Right dark strip */}
              <div className="absolute top-[15%] right-0 w-[15%] bottom-[15%] bg-black/60" />

              {/* Scanning frame corners */}
              <div className="absolute top-[15%] left-[15%] right-[15%] bottom-[15%]">
                {/* Top-left corner */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
                {/* Top-right corner */}
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
                {/* Bottom-left corner */}
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
                {/* Bottom-right corner */}
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />

                {/* Scanning line animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-[var(--color-primary)] animate-[scan-line_2s_ease-in-out_infinite]" />
              </div>
            </div>

            {/* Status Message */}
            <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 flex items-center justify-center gap-2 text-white bg-black/70 backdrop-blur-sm py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg z-10">
              {isProcessing ? (
                <>
                  <Spinner size="sm" />
                  <span className="text-xs sm:text-sm font-medium">Processing scan...</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
                  <span className="text-xs sm:text-sm font-medium">Center QR code in frame</span>
                </>
              )}
            </div>
          </div>

          {/* Add scan-line animation keyframes */}
          <style>{`
            @keyframes scan-line {
              0%, 100% { top: 0; opacity: 1; }
              50% { top: calc(100% - 2px); opacity: 0.5; }
            }
          `}</style>
          
          {/* Stop Button */}
          <button
            onClick={stopCamera}
            className="w-full inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white bg-error rounded-lg hover:bg-error-dark transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-h-[3rem] sm:min-h-[3.5rem]"
            disabled={isProcessing}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="sm:w-5 sm:h-5">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
            Stop Scanner
          </button>
        </div>
      ) : (
        <button
          onClick={startCamera}
          className="w-full inline-flex items-center justify-center gap-2.5 sm:gap-3 px-5 sm:px-6 py-3 sm:py-4 text-base sm:text-lg font-semibold text-white bg-gradient-to-r from-primary to-primary-dark rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all min-h-[3.5rem] sm:min-h-[4rem]"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="sm:w-7 sm:h-7">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Start QR Scanner
        </button>
      )}

      {/* Manual entry fallback */}
      <details className="mt-4">
        <summary className="text-muted cursor-pointer text-sm hover:text-primary transition-colors">
          Can't scan? Enter code manually
        </summary>
        <form
          className="mt-3 animate-slide-up"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const input = form.elements.namedItem("nodeKey") as HTMLInputElement;
            if (input.value) {
              submitScan(input.value);
            }
          }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              name="nodeKey"
              className="flex-1 px-4 py-2 text-sm sm:text-base bg-secondary text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-h-[2.75rem] sm:min-h-[3rem]"
              placeholder="Enter QR code"
              disabled={isProcessing}
            />
            <button type="submit" className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[2.75rem] sm:min-h-[3rem]" disabled={isProcessing}>
              {isProcessing ? <Spinner size="sm" /> : "Submit"}
            </button>
          </div>
        </form>
      </details>
    </div>
  );
}
