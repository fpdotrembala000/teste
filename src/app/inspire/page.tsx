"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Wand2, Shield } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toaster";
import { usePlaylistStore } from "@/store/usePlaylistStore";
import type { PlaylistAnalysis } from "@/types";

const VARIATIONS = [
  { value: "muito_parecida", label: "Muito parecida" },
  { value: "variada", label: "Mais variada" },
  { value: "mais_famosas", label: "Mais famosas" },
  { value: "menos_obvias", label: "Menos óbvias" },
  { value: "mais_animada", label: "Mais animada" },
  { value: "mais_calma", label: "Mais calma" },
] as const;

export default function InspirePage() {
  const router = useRouter();
  const { setCurrent, setLastPrompt } = usePlaylistStore();
  const [urls, setUrls] = useState<string[]>(["", "", ""]);
  const [variation, setVariation] = useState<(typeof VARIATIONS)[number]["value"]>(
    "variada"
  );
  const [count, setCount] = useState(30);
  const [safeMode, setSafeMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<PlaylistAnalysis | null>(null);

  async function analyze() {
    const valid = urls.map((u) => u.trim()).filter(Boolean);
    if (valid.length < 1) {
      toast("Cole ao menos 1 link de playlist.", "error");
      return;
    }
    setLoading(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/playlist/inspire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistUrls: valid,
          variation,
          count,
          safeMode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao analisar playlists");
      setAnalysis(data.analysis);
      setCurrent(data.playlist);
      setLastPrompt(`Inspirada em ${valid.length} playlists (${variation})`);
      toast("Análise pronta. Revise a playlist gerada.", "success");
      // Give the user a beat to see the analysis before navigating.
      setTimeout(() => router.push("/review"), 800);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro inesperado", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Playlist por inspiração"
        subtitle="Cole 1 a 3 links de playlists do Spotify. O app analisa e a IA cria uma nova baseada nelas."
      />

      <div className="card animate-slide-up space-y-3">
        {urls.map((u, i) => (
          <div key={i}>
            <label className="label">Playlist {i + 1}{i === 0 ? " (obrigatória)" : " (opcional)"}</label>
            <input
              className="input"
              placeholder="https://open.spotify.com/playlist/..."
              value={u}
              onChange={(e) => {
                const next = [...urls];
                next[i] = e.target.value;
                setUrls(next);
              }}
              disabled={loading}
            />
          </div>
        ))}

        <div className="grid md:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="label">Variação</label>
            <select
              className="input"
              value={variation}
              onChange={(e) => setVariation(e.target.value as never)}
              disabled={loading}
            >
              {VARIATIONS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Quantidade</label>
            <select
              className="input"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              disabled={loading}
            >
              {[20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} músicas
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setSafeMode(!safeMode)}
              className={`btn ${
                safeMode
                  ? "bg-spotify-green/15 text-spotify-green border border-spotify-green/40"
                  : "bg-white/5 text-white/70 border border-white/10"
              } w-full`}
            >
              <Shield className="w-4 h-4" /> Modo seguro {safeMode ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button onClick={analyze} disabled={loading} className="btn-primary">
            {loading ? <Spinner label="Analisando..." /> : (
              <>
                <Sparkles className="w-4 h-4" />
                Analisar e gerar
              </>
            )}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="card">
            <h3 className="text-sm font-medium mb-3">Resumo da análise</h3>
            <ul className="text-sm space-y-1.5 text-white/75">
              <li>Total de músicas: <b>{analysis.totalTracks}</b></li>
              <li>Artistas únicos: <b>{analysis.uniqueArtists}</b></li>
              <li>Popularidade média: <b>{analysis.avgPopularity}/100</b></li>
              <li>Faixas explícitas: <b>{(analysis.explicitRatio * 100).toFixed(0)}%</b></li>
            </ul>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium mb-3">Top artistas</h3>
            <ul className="text-sm space-y-1 text-white/75">
              {analysis.topArtists.slice(0, 8).map((a) => (
                <li key={a.name} className="flex justify-between">
                  <span>{a.name}</span>
                  <span className="text-white/45">{a.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium mb-3">Gêneros prováveis</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.topGenres.map((g) => (
                <span key={g.name} className="pill">
                  {g.name} <span className="text-white/40">· {g.count}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium mb-3">Décadas</h3>
            <div className="space-y-1">
              {analysis.yearDistribution.slice(0, 6).map((d) => (
                <div key={d.decade} className="flex items-center gap-2">
                  <span className="text-xs w-16 text-white/60">{d.decade}</span>
                  <div className="flex-1 bg-white/5 rounded h-2">
                    <div
                      className="h-full bg-spotify-green rounded"
                      style={{
                        width: `${
                          (d.count /
                            Math.max(...analysis.yearDistribution.map((x) => x.count))) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-white/50 w-8 text-right">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 text-center">
            <button className="btn-primary" onClick={() => router.push("/review")}>
              <Wand2 className="w-4 h-4" /> Ir para revisão
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
