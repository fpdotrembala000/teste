"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Music2, Sparkles, BarChart3, ListMusic, Wand2 } from "lucide-react";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/spotify/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) router.replace("/create");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/60">
        carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="max-w-5xl w-full grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6 animate-slide-up">
          <div className="inline-flex items-center gap-2 text-spotify-green">
            <Music2 className="w-5 h-5" />
            <span className="text-sm font-medium">Soundsmith</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">
            Crie playlists no <span className="text-spotify-green">Spotify</span> com{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-indigo-400 bg-clip-text text-transparent">
              IA
            </span>
          </h1>
          <p className="text-white/65 text-lg">
            Descreva o clima que você quer ouvir — “hip hop dos anos 90 e 2000”, “para
            estudar à noite”, “trilha sonora de filme de ação” — e a IA monta uma
            playlist completa direto na sua conta.
          </p>

          <ul className="grid grid-cols-2 gap-3 pt-2">
            <Feature icon={<Wand2 className="w-4 h-4" />} text="Prompt em linguagem natural" />
            <Feature icon={<Sparkles className="w-4 h-4" />} text="Por inspiração de outras playlists" />
            <Feature icon={<ListMusic className="w-4 h-4" />} text="Revise antes de criar" />
            <Feature icon={<BarChart3 className="w-4 h-4" />} text="Suas estatísticas estilo Wrapped" />
          </ul>

          <div className="pt-4">
            <a
              href="/api/auth/spotify/login"
              className="btn-primary text-base px-7 py-3.5"
            >
              <Music2 className="w-5 h-5" />
              Entrar com Spotify
            </a>
            {error && (
              <p className="text-red-300 text-sm mt-3">
                Erro ao entrar: {decodeURIComponent(error)}
              </p>
            )}
            <p className="text-white/40 text-xs mt-3 max-w-md">
              Você será redirecionado para o Spotify para autorizar permissões de
              leitura e criação de playlists. Nenhuma senha é compartilhada com este
              app.
            </p>
          </div>
        </div>

        <div className="card relative overflow-hidden animate-slide-up">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-spotify-green/15 via-transparent to-indigo-500/10 blur-2xl" />
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-white/50">Exemplo</p>
            <div className="bg-surface-800/70 border border-white/5 rounded-xl p-4">
              <p className="text-white/90 text-sm">
                “Faz uma playlist romântica com músicas internacionais dos anos 2000”
              </p>
            </div>
            <div className="text-xs text-white/40 pl-1">↓ a IA gera</div>
            <div className="bg-surface-800/70 border border-white/5 rounded-xl divide-y divide-white/5">
              {SAMPLE.map((s, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <span className="w-7 h-7 rounded-md bg-spotify-green/15 text-spotify-green text-xs flex items-center justify-center">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm truncate">{s.title}</p>
                    <p className="text-xs text-white/50 truncate">{s.artist}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/45">
              Você revisa, edita e clica em <b>Criar playlist no Spotify</b>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-2 text-sm text-white/70">
      <span className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-spotify-green">
        {icon}
      </span>
      {text}
    </li>
  );
}

const SAMPLE = [
  { title: "Bleeding Love", artist: "Leona Lewis" },
  { title: "I'm Yours", artist: "Jason Mraz" },
  { title: "You and Me", artist: "Lifehouse" },
  { title: "Apologize", artist: "OneRepublic" },
];
