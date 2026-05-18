"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Plus,
  RefreshCw,
  Wand2,
  Download,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toaster";
import { usePlaylistStore } from "@/store/usePlaylistStore";
import type { MatchedSong } from "@/types";

const TWEAKS = [
  "mais animada",
  "mais calma",
  "mais antiga",
  "mais atual",
  "mais brasileira",
  "mais internacional",
];

export default function ReviewPage() {
  const router = useRouter();
  const {
    current,
    options,
    lastPrompt,
    removed,
    updateCurrent,
    removeSong,
    reorderSong,
    addSongs,
    setCurrent,
    pushHistory,
  } = usePlaylistStore();

  const [loadingMore, setLoadingMore] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tweaking, setTweaking] = useState<string | null>(null);
  const [regen, setRegen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [result, setResult] = useState<{
    playlistUrl: string;
    matched: MatchedSong[];
    summary: { suggested: number; found: number; notFound: number };
  } | null>(null);

  if (!current) {
    return (
      <div className="card text-center">
        <p className="text-white/70 mb-4">Nenhuma playlist gerada ainda.</p>
        <button className="btn-primary" onClick={() => router.push("/create")}>
          <Wand2 className="w-4 h-4" /> Criar com IA
        </button>
      </div>
    );
  }

  async function generateMore(addCount: number, tweak?: string) {
    if (!current) return;
    if (tweak) setTweaking(tweak);
    else setLoadingMore(true);
    try {
      const res = await fetch("/api/playlist/more", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: lastPrompt || "Continue a playlist com músicas no mesmo estilo",
          options,
          keepExisting: current.songs.map((s) => ({ title: s.title, artist: s.artist })),
          avoid: removed,
          addCount,
          tweak,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar mais músicas");
      addSongs(data.playlist.songs);
      toast(`+${data.playlist.songs.length} músicas adicionadas.`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro inesperado", "error");
    } finally {
      setTweaking(null);
      setLoadingMore(false);
    }
  }

  async function regenerate() {
    if (!lastPrompt) return;
    setRegen(true);
    try {
      const res = await fetch("/api/playlist/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: lastPrompt, ...options, avoid: removed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao regenerar");
      setCurrent(data.playlist);
      toast("Nova versão gerada.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro inesperado", "error");
    } finally {
      setRegen(false);
    }
  }

  async function createOnSpotify() {
    if (!current) return;
    if (!current.songs.length) {
      toast("Adicione ao menos uma música.", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/playlist/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: current.playlistName,
          description: current.description,
          isPublic,
          safeMode: options.safeMode,
          songs: current.songs.map((s) => ({ title: s.title, artist: s.artist })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar playlist");
      setResult(data);
      pushHistory({
        id: crypto.randomUUID(),
        prompt: lastPrompt,
        playlistName: current.playlistName,
        createdAt: Date.now(),
        songCount: data.summary.found,
        spotifyUrl: data.playlistUrl,
      });
      toast("Playlist criada no Spotify!", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro inesperado", "error");
    } finally {
      setCreating(false);
    }
  }

  function exportAs(format: "txt" | "json" | "csv") {
    if (!current) return;
    let content = "";
    let mime = "text/plain";
    let ext = "txt";
    if (format === "json") {
      content = JSON.stringify(current, null, 2);
      mime = "application/json";
      ext = "json";
    } else if (format === "csv") {
      const header = "title,artist,genre,energy,approxYear,reason\n";
      const rows = current.songs
        .map((s) =>
          [s.title, s.artist, s.genre || "", s.energy || "", s.approxYear || "", s.reason || ""]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");
      content = header + rows;
      mime = "text/csv";
      ext = "csv";
    } else {
      content =
        `${current.playlistName}\n${current.description}\n\n` +
        current.songs.map((s, i) => `${i + 1}. ${s.title} — ${s.artist}`).join("\n");
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${current.playlistName.replace(/[^a-z0-9-_ ]/gi, "_")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Result screen, after creation.
  if (result) {
    const notFound = result.matched.filter((m) => !m.matched);
    const found = result.matched.filter((m) => m.matched);
    return (
      <div>
        <SectionHeader
          title="Playlist criada!"
          subtitle="Resumo da criação no Spotify."
        />
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-white/55">Sugeridas / Encontradas</p>
              <p className="text-xl font-semibold">
                {result.summary.found} de {result.summary.suggested} faixas adicionadas
              </p>
            </div>
            <a
              href={result.playlistUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              <ExternalLink className="w-4 h-4" /> Abrir no Spotify
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="card">
            <h3 className="text-sm font-medium text-emerald-300 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Encontradas ({found.length})
            </h3>
            <ul className="space-y-2 max-h-96 overflow-auto pr-2">
              {found.map((m, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  {m.albumImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.albumImage} alt="" className="w-8 h-8 rounded" />
                  )}
                  <span className="truncate">
                    <span className="text-white">{m.title}</span>{" "}
                    <span className="text-white/50">— {m.artist}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-red-300 mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Não encontradas ({notFound.length})
            </h3>
            {notFound.length === 0 ? (
              <p className="text-white/50 text-sm">Todas as músicas foram encontradas.</p>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-auto pr-2 text-sm">
                {notFound.map((m, i) => (
                  <li key={i} className="text-white/70">
                    {m.title} — <span className="text-white/50">{m.artist}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <button className="btn-ghost" onClick={() => setResult(null)}>
            Voltar para a revisão
          </button>
          <button className="btn-ghost" onClick={() => router.push("/create")}>
            Criar outra playlist
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Revisar playlist"
        subtitle="Edite o nome, descrição e a lista de músicas. Quando estiver pronto, crie no Spotify."
        right={
          <div className="flex gap-2">
            <button
              className="btn-ghost"
              onClick={regenerate}
              disabled={regen || creating}
              title="Gerar outra versão com o mesmo prompt"
            >
              {regen ? <Spinner /> : <RefreshCw className="w-4 h-4" />}
              Gerar outra versão
            </button>
          </div>
        }
      />

      <div className="card animate-slide-up">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Nome da playlist</label>
            <input
              className="input"
              value={current.playlistName}
              onChange={(e) => updateCurrent({ playlistName: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Descrição</label>
            <input
              className="input"
              value={current.description}
              onChange={(e) => updateCurrent({ description: e.target.value })}
            />
          </div>
        </div>

        {current.coverIdea && (
          <p className="text-xs text-white/50 mt-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-spotify-green" />
            Ideia de capa: <span className="text-white/70">{current.coverIdea}</span>
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {TWEAKS.map((t) => (
            <button
              key={t}
              type="button"
              className="pill hover:bg-white/10 hover:text-white disabled:opacity-50"
              disabled={!!tweaking}
              onClick={() => generateMore(8, `Deixe a playlist ${t}`)}
            >
              {tweaking === `Deixe a playlist ${t}` ? <Spinner /> : null} {t}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-5">
          <button
            className="btn-ghost"
            onClick={() => generateMore(10)}
            disabled={loadingMore}
          >
            {loadingMore ? <Spinner /> : <Plus className="w-4 h-4" />}
            Gerar mais músicas
          </button>
          {removed.length > 0 && (
            <button
              className="btn-ghost"
              onClick={() => generateMore(removed.length)}
              disabled={loadingMore}
              title="Adicionar substituições para as músicas removidas"
            >
              <RefreshCw className="w-4 h-4" />
              Substituir removidas ({removed.length})
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button className="btn-ghost" onClick={() => exportAs("txt")}>
              <Download className="w-4 h-4" /> TXT
            </button>
            <button className="btn-ghost" onClick={() => exportAs("json")}>
              <Download className="w-4 h-4" /> JSON
            </button>
            <button className="btn-ghost" onClick={() => exportAs("csv")}>
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Músicas ({current.songs.length})</h3>
        </div>
        <ul className="divide-y divide-white/5">
          {current.songs.map((s, i) => (
            <li
              key={`${s.title}-${s.artist}-${i}`}
              className="flex items-center gap-3 py-2.5 hover:bg-white/[0.02] rounded-lg px-2"
            >
              <span className="w-7 text-center text-xs text-white/40">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  <span className="text-white">{s.title}</span>
                  <span className="text-white/50"> — {s.artist}</span>
                </p>
                <p className="text-xs text-white/45 truncate">
                  {[s.genre, s.energy && `energia ${s.energy}`, s.approxYear]
                    .filter(Boolean)
                    .join(" · ")}
                  {s.reason && ` · ${s.reason}`}
                </p>
              </div>
              <button
                className="p-1.5 rounded-md text-white/45 hover:text-white hover:bg-white/10 disabled:opacity-30"
                onClick={() => reorderSong(i, i - 1)}
                disabled={i === 0}
                title="Subir"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 rounded-md text-white/45 hover:text-white hover:bg-white/10 disabled:opacity-30"
                onClick={() => reorderSong(i, i + 1)}
                disabled={i === current.songs.length - 1}
                title="Descer"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                className="p-1.5 rounded-md text-red-300/70 hover:text-red-300 hover:bg-red-500/15"
                onClick={() => removeSong(i)}
                title="Remover"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 sticky bottom-4">
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            className="accent-spotify-green"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Tornar pública
        </label>
        <button onClick={createOnSpotify} disabled={creating} className="btn-primary">
          {creating ? <Spinner label="Criando..." /> : "Criar playlist no Spotify"}
        </button>
      </div>
    </div>
  );
}
