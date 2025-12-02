import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { useToast } from "./Toast";

interface QRCodeGeneratorProps {
  url: string;
  title: string;
  size?: number;
  foregroundColor?: string;
  backgroundColor?: string;
  logoUrl?: string;
  onClose?: () => void;
}

export function QRCodeGenerator({
  url,
  title,
  size = 300,
  foregroundColor: initialFgColor = "#000000",
  backgroundColor: initialBgColor = "#ffffff",
  logoUrl: initialLogoUrl = "",
  onClose,
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [foregroundColor, setForegroundColor] = useState(initialFgColor);
  const [backgroundColor, setBackgroundColor] = useState(initialBgColor);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [logoSize, setLogoSize] = useState(60);
  const [errorCorrectionLevel, setErrorCorrectionLevel] = useState<"L" | "M" | "Q" | "H">("H");
  const toast = useToast();

  const generateQRCode = useCallback(async () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      // Generate QR code to canvas
      await QRCode.toCanvas(canvas, url, {
        width: size,
        margin: 2,
        color: {
          dark: foregroundColor,
          light: backgroundColor,
        },
        errorCorrectionLevel,
      });

      // Add logo if specified
      if (logoUrl) {
        const logo = new Image();
        logo.crossOrigin = "anonymous";
        logo.onload = () => {
          const logoX = (size - logoSize) / 2;
          const logoY = (size - logoSize) / 2;

          // Draw white background for logo
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);

          // Draw logo
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        };
        logo.onerror = () => {
          console.error("Failed to load logo image");
        };
        logo.src = logoUrl;
      }
    } catch (err) {
      console.error("Failed to generate QR code:", err);
    }
  }, [url, foregroundColor, backgroundColor, logoUrl, logoSize, errorCorrectionLevel, size]);

  useEffect(() => {
    generateQRCode();
  }, [generateQRCode]);

  const downloadQRCode = (format: "png" | "svg") => {
    if (!canvasRef.current) return;

    if (format === "png") {
      const link = document.createElement("a");
      link.download = `qr-${title.toLowerCase().replace(/\s+/g, "-")}.png`;
      link.href = canvasRef.current.toDataURL("image/png");
      link.click();
    } else {
      // For SVG, generate separately
      QRCode.toString(url, {
        type: "svg",
        width: size,
        margin: 2,
        color: {
          dark: foregroundColor,
          light: backgroundColor,
        },
        errorCorrectionLevel,
      }).then((svg) => {
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const link = document.createElement("a");
        link.download = `qr-${title.toLowerCase().replace(/\s+/g, "-")}.svg`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      });
    }
  };

  const printQRCode = () => {
    if (!canvasRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code - ${title}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
            }
            h2 {
              margin-bottom: 1rem;
              color: #333;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            .url {
              margin-top: 1rem;
              font-size: 0.875rem;
              color: #666;
              word-break: break-all;
              max-width: 400px;
              text-align: center;
            }
            @media print {
              body { padding: 2rem; }
            }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          <img src="${canvasRef.current.toDataURL("image/png")}" alt="QR Code" />
          <p class="url">${url}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied to clipboard!");
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose || (() => {})}
      title="QR Code Generator"
      maxWidth="max-w-[700px]"
      showCloseButton={!!onClose}
      footer={
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          <Button variant="secondary" onClick={() => downloadQRCode("png")} className="flex-1 min-w-[110px]">
            Download PNG
          </Button>
          <Button variant="secondary" onClick={() => downloadQRCode("svg")} className="flex-1 min-w-[110px]">
            Download SVG
          </Button>
          <Button variant="secondary" onClick={printQRCode} className="flex-1 min-w-[110px]">
            Print
          </Button>
          <Button variant="secondary" onClick={copyUrl} className="flex-1 min-w-[110px]">
            Copy URL
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
        <div className="flex flex-col items-center text-center">
          <h4 className="m-0 mb-3 sm:mb-4 text-sm sm:text-base font-medium text-primary">{title}</h4>
          <canvas ref={canvasRef} width={size} height={size} className="border rounded bg-white max-w-full h-auto" />
          <p className="mt-3 text-xs text-muted break-all max-w-full">{url}</p>
        </div>

        <div className="flex flex-col gap-3.5 sm:gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs sm:text-sm font-medium text-secondary">Foreground Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={foregroundColor}
                onChange={(e) => setForegroundColor(e.target.value)}
                className="w-10 h-10 p-0.5 border rounded cursor-pointer"
              />
              <input
                type="text"
                value={foregroundColor}
                onChange={(e) => setForegroundColor(e.target.value)}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-secondary text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs sm:text-sm font-medium text-secondary">Background Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-10 h-10 p-0.5 border rounded cursor-pointer"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base bg-secondary text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs sm:text-sm font-medium text-secondary">Logo URL (optional)</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-secondary text-primary placeholder-muted border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              placeholder="https://example.com/logo.png"
            />
          </div>

          {logoUrl && (
            <div className="flex flex-col gap-2">
              <label className="text-xs sm:text-sm font-medium text-secondary">Logo Size: {logoSize}px</label>
              <input
                type="range"
                min="30"
                max="100"
                value={logoSize}
                onChange={(e) => setLogoSize(Number(e.target.value))}
                className="w-full cursor-pointer"
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs sm:text-sm font-medium text-secondary">Error Correction Level</label>
            <select
              value={errorCorrectionLevel}
              onChange={(e) => setErrorCorrectionLevel(e.target.value as "L" | "M" | "Q" | "H")}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base bg-secondary text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent cursor-pointer"
            >
              <option value="L">Low (7%)</option>
              <option value="M">Medium (15%)</option>
              <option value="Q">Quartile (25%)</option>
              <option value="H">High (30%) - Best for logos</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}
