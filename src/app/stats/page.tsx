"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Info } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toaster";
import type { SpotifyArtist, SpotifyTrack } from "@/types";

type Range = "short_term" | "medium_term" | "long_term";

const RANGE_LABEL: Record<Range, string> = {
  short_term: "Últimas semanas",
  medium_term: "Últimos 6 meses",
  long_term: "Todo o período",
};

interface StatsResponse {
  timeRange: Range;
  tracks: SpotifyTrack[];
  artists: SpotifyArtist[];
  topGenres: { name: string; count: number }[];
}

export default function StatsPage() {
  const [range, setRange] = useState<Range>("medium_term");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stats/top?range=${range}&limit=30`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erro ao carregar stats");
        if (active) setData(json);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Erro inesperado", "error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [range]);

  return (
    <div>
      <SectionHeader
        title="Minhas estatísticas"
        subtitle="Suas top músicas, artistas e gêneros direto da API do Spotify."
        right={
          <div className="flex gap-1 p-1 bg-surface-800 border border-white/10 rounded-full">
            {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs rounded-full transition ${
                  r === range
                    ? "bg-spotify-green text-black font-semibold"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        }
      />

      <div className="card flex items-start gap-3 mb-6 text-sm text-white/65 animate-slide-up">
        <Info className="w-4 h-4 text-spotify-green shrink-0 mt-0.5" />
        <p>
          A API oficial do Spotify <b>não fornece</b> tempo total de escuta nem o
          histórico completo do Wrapped. O app mostra apenas o que a API libera: top
          músicas e artistas (curto, médio e longo prazo) e gêneros derivados desses
          artistas.
        </p>
      </div>

      {loading && !data ? (
        <div className="card text-center py-10">
          <Spinner label="Carregando..." />
        </div>
      ) : !data ? null : (
        <div className="space-y-6">
          {/* Hero card — Wrapped-style */}
          <div className="card relative overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-spotify-green/20 via-purple-500/10 to-indigo-500/10 blur-2xl" />
            <div className="grid md:grid-cols-3 gap-6">
              <BigStat label="Top música" track={data.tracks[0]} />
              <BigStat label="Top artista" artist={data.artists[0]} />
              <BigStat label="Top gênero" genre={data.topGenres[0]?.name} />
            </div>
          </div>

          {/* Top tracks */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-sm font-medium mb-4">Top músicas</h3>
              <ul className="divide-y divide-white/5">
                {data.tracks.slice(0, 10).map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-7 text-center text-xs text-white/40">{i + 1}</span>
                    {t.album.images?.[2]?.url || t.album.images?.[0]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.album.images[t.album.images.length - 1].url}
                        alt=""
                        className="w-10 h-10 rounded"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <a
                        href={t.external_urls?.spotify}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm truncate hover:text-spotify-green block"
                      >
                        {t.name}
                      </a>
                      <p className="text-xs text-white/50 truncate">
                        {t.artists.map((a) => a.name).join(", ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h3 className="text-sm font-medium mb-4">Top artistas</h3>
              <ul className="divide-y divide-white/5">
                {data.artists.slice(0, 10).map((a, i) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-7 text-center text-xs text-white/40">{i + 1}</span>
                    {a.images?.[a.images.length - 1]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.images[a.images.length - 1].url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10" />
                    )}
                    <div className="min-w-0 flex-1">
                      <a
                        href={a.external_urls?.spotify}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm truncate hover:text-spotify-green block"
                      >
                        {a.name}
                      </a>
                      <p className="text-xs text-white/50 truncate">
                        {(a.genres || []).slice(0, 3).join(", ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Genres bar chart */}
          <div className="card">
            <h3 className="text-sm font-medium mb-4">Gêneros mais frequentes</h3>
            {data.topGenres.length === 0 ? (
              <p className="text-white/50 text-sm">Nenhum gênero detectado.</p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topGenres} margin={{ top: 4, right: 16, left: 0, bottom: 24 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "rgba(255,255,255,0.55)" }}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.55)" }} />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      contentStyle={{
                        background: "#13131a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        color: "white",
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {data.topGenres.map((_, i) => (
                        <Cell key={i} fill={i % 2 === 0 ? "#1DB954" : "#6366f1"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BigStat({
  label,
  track,
  artist,
  genre,
}: {
  label: string;
  track?: SpotifyTrack;
  artist?: SpotifyArtist;
  genre?: string;
}) {
  const image =
    track?.album?.images?.[0]?.url || artist?.images?.[0]?.url || undefined;
  const name = track?.name || artist?.name || genre || "—";
  const sub =
    track?.artists?.map((a) => a.name).join(", ") ||
    (artist?.genres || []).slice(0, 2).join(", ") ||
    "";
  return (
    <div className="flex items-center gap-4">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="w-20 h-20 rounded-xl object-cover" />
      ) : (
        <div className="w-20 h-20 rounded-xl bg-white/10" />
      )}
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-widest text-white/55">{label}</p>
        <p className="text-lg font-semibold truncate">{name}</p>
        {sub && <p className="text-xs text-white/50 truncate">{sub}</p>}
      </div>
    </div>
  );
}
