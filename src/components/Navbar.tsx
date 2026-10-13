"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Droplets,
  QrCode,
  Users,
  ShoppingCart,
  Receipt,
  BookOpen,
  LayoutDashboard,
  Menu,
  X,
  Smartphone,
  Database,
  ExternalLink,
  Copy,
  Check,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import QRCode from "qrcode";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [driverQrDataUrl, setDriverQrDataUrl] = useState("");
  const [driverUrl, setDriverUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Authentication check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isPublicPath = pathname === "/login" || pathname === "/driver";
      const session = localStorage.getItem("sw_owner_session");
      if (!isPublicPath && !session) {
        // If not logged in, redirect to login
        router.push("/login");
      }
    }
  }, [pathname, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/driver`;
      setDriverUrl(url);
      QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: { dark: "#0F172A", light: "#FFFFFF" },
      })
        .then((dataUrl) => setDriverQrDataUrl(dataUrl))
        .catch((e) => console.error("QR gen error:", e));
    }
  }, []);

  const handleCopyDriverLink = () => {
    navigator.clipboard.writeText(driverUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}
    localStorage.removeItem("sw_owner_session");
    router.push("/login");
  };

  // If on login or driver app, don't show the main top ERP header
  if (pathname === "/login" || pathname === "/driver") {
    return null;
  }

  // Clean, professional English navigation
  const navLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/jars", label: "20L Jars", icon: QrCode },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/orders", label: "Orders", icon: ShoppingCart },
    { href: "/invoices", label: "Invoices", icon: Receipt },
    { href: "/accounting", label: "Accounting", icon: BookOpen },
    { href: "/backup", label: "Backup & Data", icon: Database },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                  <Droplets className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                      Sai Waters
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                      ERP
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold -mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>System Live</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Middle: Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1.5 overflow-x-auto py-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-sky-50 text-sky-700 shadow-xs border border-sky-200/80"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-sky-600" : "text-slate-400"}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right: Driver Connect, Owner Profile & Logout */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Driver Mobile QR Launcher */}
              <button
                onClick={() => setDriverModalOpen(true)}
                title="Driver Mobile App Link & QR"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Driver App</span>
              </button>

              {/* Sole Owner Access Badge */}
              <div className="flex items-center gap-2 bg-slate-50 py-1.5 px-2.5 rounded-xl border border-slate-200">
                <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-xs shadow-2xs">
                  S
                </div>
                <div className="text-left leading-tight hidden sm:block">
                  <span className="text-xs font-black text-slate-900 block">Sai (Owner)</span>
                  <span className="text-[10px] font-extrabold text-emerald-600 tracking-wider block">
                    ACTIVE
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                title="Log Out of ERP"
                className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Menu Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-5 space-y-2 shadow-xl animate-in slide-in-from-top duration-150">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setDriverModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-xs mb-3"
            >
              <Smartphone className="w-4 h-4" />
              <span>Open Driver App QR</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold ${
                      isActive
                        ? "bg-sky-50 text-sky-700 border border-sky-200"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-4 h-4 text-sky-600" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Driver Mobile Access Modal */}
      {driverModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-black uppercase text-purple-700 tracking-wider">
                Driver PWA Mobile App
              </span>
              <button
                onClick={() => setDriverModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-1">Driver Phone Scan QR</h3>
            <p className="text-xs text-slate-500 mb-4">
              Driver apne phone camera se is QR ko scan karega toh direct Driver PWA Portal khul jayega:
            </p>

            {driverQrDataUrl ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mb-4 shadow-inner">
                <img
                  src={driverQrDataUrl}
                  alt="Driver Access QR"
                  className="w-48 h-48 mx-auto rounded-xl"
                />
              </div>
            ) : (
              <div className="w-48 h-48 mx-auto flex items-center justify-center bg-slate-100 rounded-2xl mb-4">
                <span className="text-xs text-slate-400">Loading QR...</span>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleCopyDriverLink}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Link Copied!" : "Copy Driver URL Link"}</span>
              </button>

              <a
                href="/driver"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 block"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Driver Portal Directly</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
