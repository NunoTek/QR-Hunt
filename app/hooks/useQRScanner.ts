import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "~/components/Toast";
import { QR_SCANNER } from "~/config/constants";

type BarcodeDetectorType = {
  detect: (source: HTMLCanvasElement | ImageBitmap) => Promise<Array<{ rawValue: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorType;
  }
}

export interface UseQRScannerOptions {
  /** Cooldown between scan attempts in milliseconds */
  scanCooldownMs?: number;
  /** Called when a QR code is successfully detected */
  onScan: (qrData: string) => boolean | Promise<boolean>;
  /** Whether to auto-start the camera on mount */
  autoStart?: boolean;
}

export interface UseQRScannerResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isScanning: boolean;
  cameraError: string | null;
  isProcessing: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  resetScanner: () => void;
}

/**
 * Shared hook for QR code scanning functionality.
 * Handles camera initialization, QR detection, and cleanup.
 */
export function useQRScanner({
  scanCooldownMs = QR_SCANNER.SCAN_COOLDOWN_MS,
  onScan,
  autoStart = false,
}: UseQRScannerOptions): UseQRScannerResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetectorType | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);
  const lastScanAttemptRef = useRef<number>(0);
  const hasAutoStartedRef = useRef(false);
  const toast = useToast();

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

  const resetScanner = useCallback(() => {
    setCameraError(null);
    lastScannedRef.current = null;
    isProcessingRef.current = false;
    setIsProcessing(false);
  }, []);

  /** Extracts node key from QR code URL */
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

  /** Processes detected QR code data */
  const processBarcode = useCallback(
    async (qrData: string): Promise<boolean> => {
      // Skip if already processing or within cooldown period
      if (isProcessingRef.current) {
        return false;
      }

      const now = Date.now();
      if (now - lastScanAttemptRef.current < scanCooldownMs) {
        return false;
      }

      // Skip if same as last scanned
      if (qrData === lastScannedRef.current) {
        return false;
      }

      isProcessingRef.current = true;
      setIsProcessing(true);
      lastScannedRef.current = qrData;
      lastScanAttemptRef.current = now;

      try {
        const result = await onScan(qrData);
        if (result) {
          stopCamera();
          return true;
        }
      } finally {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }

      return false;
    },
    [onScan, scanCooldownMs, stopCamera]
  );

  /** Scanning loop using requestAnimationFrame */
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
        barcodeDetectorRef.current = null;
      }
    }

    // Skip detection if already processing
    if (isProcessingRef.current) {
      animationRef.current = requestAnimationFrame(scanQRCode);
      return;
    }

    if (barcodeDetectorRef.current) {
      // Use native BarcodeDetector (Chrome, Edge, etc.)
      barcodeDetectorRef.current
        .detect(canvas)
        .then(async (barcodes) => {
          if (barcodes.length > 0 && barcodes[0].rawValue) {
            if (await processBarcode(barcodes[0].rawValue)) {
              return;
            }
          }
          animationRef.current = requestAnimationFrame(scanQRCode);
        })
        .catch(() => {
          animationRef.current = requestAnimationFrame(scanQRCode);
        });
    } else {
      // Fallback to jsQR for iOS Safari and other browsers without BarcodeDetector
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        processBarcode(code.data).then((processed) => {
          if (!processed) {
            animationRef.current = requestAnimationFrame(scanQRCode);
          }
        });
      } else {
        animationRef.current = requestAnimationFrame(scanQRCode);
      }
    }
  }, [processBarcode]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
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
            width: { ideal: QR_SCANNER.VIDEO_WIDTH },
            height: { ideal: QR_SCANNER.VIDEO_HEIGHT },
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
      setIsScanning(true);
    } catch (err) {
      const errorMsg = getCameraErrorMessage(err);
      setCameraError(errorMsg);
      toast.error(errorMsg);
    }
  }, [toast]);

  // Auto-start camera if enabled
  useEffect(() => {
    if (autoStart && !hasAutoStartedRef.current && !isScanning) {
      hasAutoStartedRef.current = true;
      startCamera();
    }
  }, [autoStart, isScanning, startCamera]);

  // Cleanup on unmount
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

  return {
    videoRef,
    canvasRef,
    isScanning,
    cameraError,
    isProcessing,
    startCamera,
    stopCamera,
    resetScanner,
  };
}

/** Maps camera errors to user-friendly messages */
function getCameraErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) {
    return "Unable to access camera.";
  }

  switch (err.name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera permission denied. Please allow camera access and try again.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera found on this device.";
    case "NotReadableError":
    case "TrackStartError":
      return "Camera is already in use by another application.";
    case "OverconstrainedError":
      return "Camera doesn't meet requirements. Try a different device.";
    case "SecurityError":
      return "Camera access blocked due to security settings.";
    default:
      return "Unable to access camera.";
  }
}

/** Extracts node key from QR code URL */
export function extractNodeKeyFromUrl(url: string): string | null {
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
}
