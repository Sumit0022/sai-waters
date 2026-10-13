"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  X,
  Zap,
  ZapOff,
  SwitchCamera,
  Keyboard,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Sparkles,
} from "lucide-react";

interface QrCameraScannerProps {
  onScanSuccess: (code: string) => void;
  onManualSubmit?: (code: string) => void;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  placeholderText?: string;
  helperText?: string;
}

export default function QrCameraScanner({
  onScanSuccess,
  onManualSubmit,
  onClose,
  title = "Scan QR Code",
  subtitle = "Align QR inside frame to scan",
  placeholderText = "Enter QR token or code manually...",
  helperText = "Point camera at Sai Waters QR sticker",
}: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [laserPos, setLaserPos] = useState(10); // Percentage from top

  // Subtle PhonePe-style success audio beep
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 clear chime
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}
  };

  // Stop camera tracks cleanly
  const stopCamera = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (codeReaderRef.current) {
        codeReaderRef.current.reset?.();
        codeReaderRef.current.stop?.();
      }
    } catch (e) {}
    setCameraActive(false);
    setTorchOn(false);
  };

  // Start Camera with Normal 1x Focal Length (filtering out ultra-wide & macro)
  const startCamera = async (deviceId?: string) => {
    setCameraError("");
    setLastScannedCode(null);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      setVideoDevices(devices);

      let targetId = deviceId;
      if (!targetId && devices.length > 0) {
        // Filter out ultra-wide (0.5x, 0.6x) and macro lenses which distort QR codes
        const normalCameras = devices.filter((d: any) => {
          const lbl = (d.label || "").toLowerCase();
          return (
            !lbl.includes("ultra") &&
            !lbl.includes("0.5") &&
            !lbl.includes("0.6") &&
            !lbl.includes("macro") &&
            !lbl.includes("wide-angle") &&
            !lbl.includes("depth")
          );
        });

        const pool = normalCameras.length > 0 ? normalCameras : devices;
        // Prioritize back / rear / environment camera
        const backCamera = pool.find((d: any) => {
          const lbl = (d.label || "").toLowerCase();
          return lbl.includes("back") || lbl.includes("rear") || lbl.includes("environment");
        });

        targetId = backCamera ? backCamera.deviceId : pool[0]?.deviceId;
      }

      setSelectedDeviceId(targetId || "");

      if (videoRef.current) {
        // ZXing decode loop
        await codeReader.decodeFromVideoDevice(
          targetId,
          videoRef.current,
          (result, error, controls) => {
            if (result) {
              const text = result.getText();
              playBeep();
              if (typeof window !== "undefined" && navigator.vibrate) {
                try {
                  navigator.vibrate([40, 30, 40]);
                } catch (e) {}
              }
              setLastScannedCode(text);

              // Small delay to show green confirmation tick
              setTimeout(() => {
                onScanSuccess(text);
              }, 400);
            }
          }
        );

        setCameraActive(true);

        // Check torch capability & clamp zoom to standard 1.0 (normal focal length)
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          streamRef.current = stream;
          const track = stream.getVideoTracks()[0];
          const capabilities = (track as any)?.getCapabilities?.();

          if (capabilities && "torch" in capabilities) {
            setHasTorch(true);
          }

          // If phone camera defaulted to wide zoom, force 1x standard normal zoom
          if (capabilities && "zoom" in capabilities && (track as any).applyConstraints) {
            try {
              const normalZoom = Math.max(1, capabilities.zoom.min || 1);
              await (track as any).applyConstraints({
                advanced: [{ zoom: normalZoom }],
              });
            } catch (e) {}
          }
        }
      }
    } catch (err: any) {
      console.error("Camera scanner error:", err);
      setCameraError(
        err?.message || "Camera access denied. Please allow camera permissions or enter code manually."
      );
      setCameraActive(false);
    }
  };

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track as any).applyConstraints) {
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: !torchOn }],
        });
        setTorchOn(!torchOn);
      } catch (e) {}
    }
  };

  // Flip Camera
  const switchCamera = () => {
    if (videoDevices.length < 2) return;
    const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];
    stopCamera();
    startCamera(nextDevice.deviceId);
  };

  // Animate PhonePe scanning laser
  useEffect(() => {
    const interval = setInterval(() => {
      setLaserPos((prev) => (prev >= 85 ? 10 : prev + 6));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    if (onManualSubmit) {
      onManualSubmit(manualInput.trim());
    } else {
      onScanSuccess(manualInput.trim());
    }
    setManualInput("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
      {/* 1. Immersive Video Background (Normal 1x view, covers full screen) */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* 2. Top Header Bar (PhonePe Style) */}
      <header className="relative z-20 flex items-center justify-between p-4 pt-6 sm:pt-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Back / Close button */}
        <button
          type="button"
          onClick={() => {
            stopCamera();
            if (onClose) onClose();
          }}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer border border-white/15 shadow-lg"
          title="Close Scanner"
        >
          {onClose ? <ArrowLeft className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>

        {/* Center Title */}
        <div className="text-center text-white px-2">
          <h2 className="text-base font-black tracking-tight drop-shadow-md">{title}</h2>
          <p className="text-[11px] text-slate-300 font-medium drop-shadow-xs">{subtitle}</p>
        </div>

        {/* Action Controls (Torch & Camera Switch) */}
        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border shadow-lg ${
                torchOn
                  ? "bg-amber-400 text-slate-950 border-amber-300 shadow-amber-400/30"
                  : "bg-white/10 hover:bg-white/20 text-white border-white/15"
              }`}
              title="Toggle Flashlight"
            >
              {torchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          {videoDevices.length > 1 && (
            <button
              type="button"
              onClick={switchCamera}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer border border-white/15 shadow-lg"
              title="Switch Front/Back Camera"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* 3. Central Viewfinder (PhonePe Cutout with Vignette Overlay) */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 aspect-square max-w-[80vw] max-h-[80vw] flex items-center justify-center">
          {/* Outer Dimming Vignette Mask via box-shadow */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.65)",
            }}
          />

          {/* Corner Brackets (PhonePe Emerald Accents) */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Top-Left */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl shadow-[0_0_8px_#34d399]" />
            {/* Top-Right */}
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl shadow-[0_0_8px_#34d399]" />
            {/* Bottom-Left */}
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl shadow-[0_0_8px_#34d399]" />
            {/* Bottom-Right */}
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl shadow-[0_0_8px_#34d399]" />
          </div>

          {/* Animated Scanning Laser Line */}
          {cameraActive && !lastScannedCode && (
            <div
              className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] pointer-events-none transition-all duration-75"
              style={{ top: `${laserPos}%` }}
            />
          )}

          {/* Success Recognition Overlay */}
          {lastScannedCode && (
            <div className="absolute inset-0 rounded-3xl bg-emerald-500/25 border-2 border-emerald-400 flex flex-col items-center justify-center p-4 backdrop-blur-2xs animate-in zoom-in-95 duration-150">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/50 mb-2 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-white text-xs font-black bg-black/60 px-3 py-1 rounded-full border border-white/10">
                {lastScannedCode}
              </span>
            </div>
          )}
        </div>

        {/* Guidance Pill below the box */}
        <div className="mt-6 text-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold border border-white/15 shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{helperText}</span>
          </span>
        </div>

        {/* Camera Permission Error Notice */}
        {cameraError && (
          <div className="mt-4 p-4 max-w-xs mx-auto bg-rose-950/90 border border-rose-500/50 rounded-2xl text-center text-rose-200 text-xs backdrop-blur-md shadow-xl">
            <AlertTriangle className="w-6 h-6 text-rose-400 mx-auto mb-1.5" />
            <p className="font-semibold mb-2">{cameraError}</p>
            <button
              type="button"
              onClick={() => startCamera()}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs"
            >
              Retry Camera
            </button>
          </div>
        )}
      </div>

      {/* 4. Bottom Controls: Manual Entry Sheet & Keyboard Trigger */}
      <footer className="relative z-20 p-4 pb-8 sm:pb-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col items-center gap-3">
        {/* Toggle Manual Input Button */}
        {!showManualInput ? (
          <button
            type="button"
            onClick={() => setShowManualInput(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs font-bold border border-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <Keyboard className="w-4 h-4 text-emerald-400" />
            <span>Sticker Scratched? Enter Code Manually</span>
          </button>
        ) : (
          <form
            onSubmit={handleManualSubmit}
            className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-white/15 p-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom duration-150"
          >
            <div className="relative flex-1">
              <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder={placeholderText}
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                autoFocus
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 rounded-xl border border-slate-700 text-white text-xs font-bold placeholder-slate-400 focus:outline-hidden focus:border-emerald-400"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md cursor-pointer"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => setShowManualInput(false)}
              className="p-2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}
      </footer>
    </div>
  );
}
