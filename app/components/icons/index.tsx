import type { SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

const defaultProps: IconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
};

function createIcon(paths: string | string[], displayName: string) {
  const Icon = ({ size, width, height, ...props }: IconProps) => (
    <svg
      {...defaultProps}
      width={size ?? width ?? 24}
      height={size ?? height ?? 24}
      {...props}
    >
      {Array.isArray(paths)
        ? paths.map((d, i) => <path key={i} d={d} />)
        : <path d={paths} />}
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
}

// Navigation & Actions
export const ChevronDown = createIcon("M6 9l6 6 6-6", "ChevronDown");
export const ChevronUp = createIcon("M18 15l-6-6-6 6", "ChevronUp");
export const ChevronLeft = createIcon("M15 6l-6 6 6 6", "ChevronLeft");
export const ChevronRight = createIcon("M9 6l6 6-6 6", "ChevronRight");
export const ArrowLeft = createIcon(["M19 12H5", "M12 19l-7-7 7-7"], "ArrowLeft");
export const ArrowRight = createIcon(["M5 12h14", "M12 5l7 7-7 7"], "ArrowRight");

// Close & Check
export const Close = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
Close.displayName = "Close";

export const Check = createIcon("M20 6L9 17l-5-5", "Check");
export const CheckCircle = createIcon(["M22 11.08V12a10 10 0 1 1-5.93-9.14", "M22 4L12 14.01l-3-3"], "CheckCircle");

// Media & Camera
export const Camera = createIcon(
  ["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z", "M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  "Camera"
);

// Location
export const MapPin = createIcon(
  ["M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z", "M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  "MapPin"
);

// Users & Teams
export const Users = createIcon(
  ["M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2", "M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M23 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  "Users"
);
export const User = createIcon(
  ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  "User"
);

// Communication
export const MessageSquare = createIcon("M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", "MessageSquare");

// Stats & Charts
export const BarChart = createIcon(["M12 20V10", "M18 20V4", "M6 20v-4"], "BarChart");
export const Activity = createIcon("M22 12h-4l-3 9L9 3l-3 9H2", "Activity");

// Star & Rating
export const Star = createIcon(
  "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  "Star"
);

// List & Menu
export const List = createIcon(
  ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"],
  "List"
);
export const Menu = createIcon(["M3 12h18", "M3 6h18", "M3 18h18"], "Menu");

// Play & Pause
export const Play = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);
Play.displayName = "Play";

// Refresh & Sync
export const RefreshCw = createIcon(
  ["M23 4v6h-6", "M1 20v-6h6", "M3.51 9a9 9 0 0 1 14.85-3.36L23 10", "M1 14l4.64 4.36A9 9 0 0 0 20.49 15"],
  "RefreshCw"
);
export const Shuffle = createIcon(
  ["M21 2v6h-6", "M3 12a9 9 0 0 1 15-6.7L21 8", "M3 22v-6h6", "M21 12a9 9 0 0 1-15 6.7L3 16"],
  "Shuffle"
);

// Share & Link
export const Share = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
Share.displayName = "Share";

export const Link = createIcon(
  ["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"],
  "Link"
);

export const Copy = createIcon(
  ["M9 9h13v13H9z", "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"],
  "Copy"
);

// Help & Info
export const HelpCircle = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
HelpCircle.displayName = "HelpCircle";

export const AlertTriangle = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
AlertTriangle.displayName = "AlertTriangle";

// Settings & Edit
export const Settings = createIcon(
  ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"],
  "Settings"
);
export const Edit = createIcon(
  ["M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"],
  "Edit"
);
export const Trash = createIcon(
  ["M3 6h18", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"],
  "Trash"
);

// Misc
export const Clock = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
Clock.displayName = "Clock";

export const Download = createIcon(
  ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
  "Download"
);

export const ExternalLink = createIcon(
  ["M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", "M15 3h6v6", "M10 14L21 3"],
  "ExternalLink"
);

export const Eye = createIcon(
  ["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
  "Eye"
);

export const EyeOff = createIcon(
  ["M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24", "M1 1l22 22"],
  "EyeOff"
);

export const LogOut = createIcon(
  ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "M16 17l5-5-5-5", "M21 12H9"],
  "LogOut"
);

export const QrCode = createIcon(
  ["M3 3h7v7H3z", "M14 3h7v7h-7z", "M3 14h7v7H3z", "M14 14h3v3h-3z", "M17 17h4v4h-4z", "M14 17h3v4h-3z", "M17 14h4v3h-4z"],
  "QrCode"
);

export const Wifi = createIcon(
  ["M5 12.55a11 11 0 0 1 14.08 0", "M1.42 9a16 16 0 0 1 21.16 0", "M8.53 16.11a6 6 0 0 1 6.95 0", "M12 20h.01"],
  "Wifi"
);

export const WifiOff = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
    <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);
WifiOff.displayName = "WifiOff";

export const Loader = ({ size, width, height, className, ...props }: IconProps) => (
  <svg
    {...defaultProps}
    width={size ?? width ?? 24}
    height={size ?? height ?? 24}
    className={`animate-spin ${className || ""}`}
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
Loader.displayName = "Loader";

// Theme icons
export const Sun = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);
Sun.displayName = "Sun";

export const Moon = createIcon("M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z", "Moon");

export const Monitor = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);
Monitor.displayName = "Monitor";

// Plus & Minus
export const Plus = createIcon(["M12 5v14", "M5 12h14"], "Plus");
export const Minus = createIcon("M5 12h14", "Minus");

// Info
export const Info = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);
Info.displayName = "Info";

// Zoom icons
export const ZoomIn = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);
ZoomIn.displayName = "ZoomIn";

export const ZoomOut = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);
ZoomOut.displayName = "ZoomOut";

// Media icons
export const Music = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);
Music.displayName = "Music";

export const Image = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);
Image.displayName = "Image";

// Upload / Share for iOS
export const Upload = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);
Upload.displayName = "Upload";

// Rotate / Reset
export const RotateCcw = createIcon(
  ["M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", "M3 3v5h5"],
  "RotateCcw"
);

// Auth icons
export const LogIn = createIcon(
  ["M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4", "M10 17l5-5-5-5", "M15 12H3"],
  "LogIn"
);

// Repeat/cycle
export const Repeat = createIcon(
  ["M17 1l4 4-4 4", "M3 11V9a4 4 0 0 1 4-4h14", "M7 23l-4-4 4-4", "M21 13v2a4 4 0 0 1-4 4H3"],
  "Repeat"
);

// Send
export const Send = createIcon("M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z", "Send");

// Alert circle (info/error indicator)
export const AlertCircle = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
AlertCircle.displayName = "AlertCircle";

// Lock
export const Lock = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
Lock.displayName = "Lock";

// Camera off
export const CameraOff = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <path d="M1 1l22 22" />
    <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34" />
    <path d="M15 11a3 3 0 1 0-5.5 1.5" />
  </svg>
);
CameraOff.displayName = "CameraOff";

// Hexagon / Box (for game ID)
export const Hexagon = createIcon(
  "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  "Hexagon"
);

// Circle (empty state indicator)
export const Circle = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <circle cx="12" cy="12" r="10" />
  </svg>
);
Circle.displayName = "Circle";

// Share
export const Share2 = ({ size, width, height, ...props }: IconProps) => (
  <svg {...defaultProps} width={size ?? width ?? 24} height={size ?? height ?? 24} {...props}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
Share2.displayName = "Share2";

// Link
export const Link2 = createIcon(
  ["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"],
  "Link2"
);

// Loader/Spinner animation
export const LoaderCircle = createIcon("M21 12a9 9 0 1 1-6.219-8.56", "LoaderCircle");
