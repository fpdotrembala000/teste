"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { usePlaylistStore } from "@/store/usePlaylistStore";

export default function HistoryPage() {
  const { history, clearHistory } = usePlaylistStore();

  return (
    <div>
      <SectionHeader
        title="Histórico"
        subtitle="Playlists que você gerou neste dispositivo (armazenadas localmente)."
        right={
          history.length > 0 ? (
            <button className="btn-ghost" onClick={clearHistory}>
              <Trash2 className="w-4 h-4" /> Limpar
            </button>
          ) : null
        }
      />

      {history.length === 0 ? (
        <div className="card text-center text-white/55">
          Nenhuma playlist gerada ainda.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {history.map((h) => (
            <div key={h.id} className="card">
              <p className="text-xs text-white/45 mb-1">
                {new Date(h.createdAt).toLocaleString("pt-BR")}
              </p>
              <h3 className="text-base font-semibold">{h.playlistName}</h3>
              <p className="text-sm text-white/65 mt-1 line-clamp-2 italic">
                “{h.prompt}”
              </p>
              <div className="flex items-center justify-between mt-4">
                <span className="pill">{h.songCount} músicas</span>
                {h.spotifyUrl && (
                  <a
                    href={h.spotifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-spotify-green text-sm inline-flex items-center gap-1 hover:underline"
                  >
                    Abrir no Spotify <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
