import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/Toaster";

export const metadata: Metadata = {
  title: "Soundsmith — Playlists com IA no Spotify",
  description:
    "Crie playlists incríveis no Spotify usando prompts em linguagem natural, com a inteligência da Anthropic.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-hero-gradient min-h-screen">
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
