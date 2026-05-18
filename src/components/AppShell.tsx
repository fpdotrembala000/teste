"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Sparkles,
  ListMusic,
  BarChart3,
  Settings,
  History,
  LogOut,
  Music2,
  Wand2,
  Menu,
  X,
} from "lucide-react";
import { classNames } from "@/lib/utils";
import { toast } from "./Toaster";
import type { SpotifyUser } from "@/types";

const NAV = [
  { href: "/create", label: "Criar com IA", icon: Wand2 },
  { href: "/inspire", label: "Por Inspiração", icon: Sparkles },
  { href: "/review", label: "Revisar", icon: ListMusic },
  { href: "/stats", label: "Minhas Stats", icon: BarChart3 },
  { href: "/history", label: "Histórico", icon: History },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Pages that do not require auth.
  const isPublic = pathname === "/login" || pathname === "/";

  useEffect(() => {
    let active = true;
    fetch("/api/auth/spotify/me")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data.authenticated) setUser(data.user);
        else setUser(null);
        setAuthChecked(true);
        if (!data.authenticated && !isPublic) {
          router.replace("/login");
        }
      })
      .catch(() => {
        if (!active) return;
        setAuthChecked(true);
        if (!isPublic) router.replace("/login");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/spotify/logout", { method: "POST" });
    toast("Você saiu do Spotify.", "success");
    router.push("/login");
  }

  // Public pages: just render children without sidebar.
  if (isPublic) {
    return <main className="min-h-screen">{children}</main>;
  }

  // Avoid layout flash before auth check completes.
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse_soft text-white/60 flex items-center gap-2">
          <Music2 className="w-5 h-5" /> carregando...
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex">
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-surface-900/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <Link href="/create" className="flex items-center gap-2 font-semibold">
          <Music2 className="w-5 h-5 text-spotify-green" /> Soundsmith
        </Link>
        <button
          className="p-2 rounded-lg hover:bg-white/10"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={classNames(
          "fixed md:sticky top-0 left-0 h-screen w-64 bg-surface-900/70 backdrop-blur-xl border-r border-white/5 z-30 transition-transform",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-5 border-b border-white/5">
          <Link href="/create" className="flex items-center gap-2 text-lg font-semibold">
            <span className="w-9 h-9 rounded-xl bg-spotify-green/20 border border-spotify-green/30 flex items-center justify-center">
              <Music2 className="w-5 h-5 text-spotify-green" />
            </span>
            Soundsmith
          </Link>
          <p className="text-xs text-white/50 mt-1">Playlists com IA · Spotify</p>
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={classNames(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition",
                  active
                    ? "bg-spotify-green/15 text-spotify-green border border-spotify-green/25"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4" /> {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5 bg-surface-900/80">
          <div className="flex items-center gap-3">
            {user.images?.[0]?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.images[0].url}
                alt={user.display_name}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs">
                {user.display_name?.[0] || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{user.display_name}</p>
              <p className="text-[11px] text-white/50 truncate">
                {user.product === "premium" ? "Premium" : "Free"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">{children}</div>
      </main>
    </div>
  );
}
