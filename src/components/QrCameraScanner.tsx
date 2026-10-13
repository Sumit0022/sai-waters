"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, AlertTriangle, SwitchCamera, Zap, ZapOff, CheckCircle } from "lucide-react";

interface QrCameraScannerProps {
  onScanSuccess: (code: string) => void;
  onManualSubmit?: (code: string) => void;
  placeholderText?: string;
  helperText?: string;
  autoCloseOnSuccess?: boolean;
}

export default function QrCameraScanner({
  onScanSuccess,
  onManualSubmit,
  placeholderText = "Enter or scan QR token / jar code...",
  helperText = "Align QR code inside the box / QR code ko frame ke beech mein layein",
}: QrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [manualInput, setManualInput] = useState("");
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  // Play subtle feedback beep
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {}
  };

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
      if (!targetId) {
        const backCamera = devices.find(
          (d: any) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment")
        );
        targetId = backCamera ? backCamera.deviceId : devices[0]?.deviceId;
      }
      setSelectedDeviceId(targetId || "");

      if (videoRef.current) {
        const controls = await codeReader.decodeFromVideoDevice(
          targetId,
          videoRef.current,
          (result, error, controls) => {
            if (result) {
              const text = result.getText();
              playBeep();
              setLastScannedCode(text);
              onScanSuccess(text);
              setTimeout(() => setLastScannedCode(null), 1500);
            }
          }
        );

        setCameraActive(true);

        // Check torch support
        if (videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          streamRef.current = stream;
          const track = stream.getVideoTracks()[0];
          const capabilities = (track as any)?.getCapabilities?.();
          if (capabilities && "torch" in capabilities) {
            setHasTorch(true);
          }
        }
      }
    } catch (err: any) {
      console.error("Camera scanner error:", err);
      setCameraError(err?.message || "Camera permission denied or camera not found. Use manual input below.");
      setCameraActive(false);
    }
  };

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

  const switchCamera = () => {
    if (videoDevices.length < 2) return;
    const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    const nextDevice = videoDevices[nextIndex];
    stopCamera();
    startCamera(nextDevice.deviceId);
  };

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
    <div className="space-y-4">
      {/* Viewport Container */}
      <div className="relative w-full max-w-md mx-auto aspect-4/3 sm:aspect-square bg-slate-950 rounded-2xl overflow-hidden shadow-xl border border-slate-800 flex items-center justify-center">
        {/* Video feed */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />

        {/* Reticle / Viewfinder Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Darkened Mask outside the reticle */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></div>

            {/* Animated Laser Scanning Line */}
            {cameraActive && (
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-bounce"></div>
            )}

            {/* Success flash */}
            {lastScannedCode && (
              <div className="absolute inset-0 bg-emerald-500/30 rounded-xl flex items-center justify-center border-2 border-emerald-400">
                <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-black shadow-lg flex items-center gap-1.5 animate-pulse">
                  <CheckCircle className="w-4 h-4" />
                  Scanned: {lastScannedCode}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Camera Control Toolbar (Top Right Overlay) */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                torchOn ? "bg-amber-500 text-white" : "bg-black/50 text-white hover:bg-black/70"
              }`}
              title="Toggle Flashlight"
            >
              {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {videoDevices.length > 1 && (
            <button
              type="button"
              onClick={switchCamera}
              className="p-2 rounded-xl bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all"
              title="Switch Camera (Front/Back)"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              stopCamera();
              startCamera(selectedDeviceId);
            }}
            className="p-2 rounded-xl bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all"
            title="Restart Camera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Error Message */}
        {cameraError && (
          <div className="absolute inset-4 bg-slate-900/95 rounded-2xl p-5 flex flex-col items-center justify-center text-center text-rose-300">
            <AlertTriangle className="w-8 h-8 text-rose-400 mb-2" />
            <p className="text-xs font-semibold mb-3">{cameraError}</p>
            <button
              type="button"
              onClick={() => startCamera()}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
            >
              Retry Camera Permission
            </button>
          </div>
        )}

        {/* Bottom Helper Instruction */}
        <div className="absolute bottom-2.5 inset-x-0 text-center pointer-events-none">
          <span className="inline-block px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-slate-200 border border-white/10 shadow-sm">
            {helperText}
          </span>
        </div>
      </div>

      {/* Manual Input Fallback Form */}
      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={placeholderText}
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all shadow-xs"
        >
          Submit Code
        </button>
      </form>
    </div>
  );
}
