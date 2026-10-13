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
  Database,
  LogOut,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

          {/* Middle: Desktop Navigation (Spacious, fits all tabs without horizontal scroll) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 py-1">
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

          {/* Right: Clean Logout & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="Log Out of ERP"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-600 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-5 space-y-2 shadow-xl animate-in slide-in-from-top duration-150">
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
  );
}
