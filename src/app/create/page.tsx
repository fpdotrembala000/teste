"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Sparkles, Compass, Shield } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { Spinner } from "@/components/Spinner";
import { toast } from "@/components/Toaster";
import { usePlaylistStore } from "@/store/usePlaylistStore";
import type { AIPlaylist } from "@/types";

const PROMPT_EXAMPLES = [
  "Faz uma playlist de hip hop com músicas dos anos 90 e 2000",
  "Cria uma playlist para eu ouvir viajando",
  "Trap brasileiro para treinar pesado",
  "Playlist romântica internacional dos anos 2000",
  "Trilha sonora de filme de ação",
  "Músicas calmas para estudar à noite",
];

export default function CreatePage() {
  const router = useRouter();
  const { options, setOptions, setCurrent, setLastPrompt, lastPrompt } =
    usePlaylistStore();
  const [prompt, setPrompt] = useState(lastPrompt || "");
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (prompt.trim().length < 3) {
      toast("Descreva melhor a playlist que você quer.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/playlist/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ...options }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar playlist");
      setCurrent(data.playlist as AIPlaylist);
      setLastPrompt(prompt);
      toast("Playlist gerada! Revise antes de criar no Spotify.", "success");
      router.push("/review");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Erro inesperado", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SectionHeader
        title="Criar playlist com IA"
        subtitle="Descreva o clima, estilo, época ou contexto. A IA monta a playlist e você revisa antes de enviar pro Spotify."
      />

      <div className="card animate-slide-up">
        <label className="label">O que você quer ouvir?</label>
        <textarea
          className="input min-h-[110px] text-base"
          placeholder="ex: Faz uma playlist de hip hop com músicas dos anos 90 e 2000"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
        />

        <div className="flex flex-wrap gap-2 mt-3">
          {PROMPT_EXAMPLES.map((p) => (
            <button
              key={p}
              type="button"
              className="pill hover:bg-white/10 hover:text-white"
              onClick={() => setPrompt(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <Field label="Quantidade">
            <select
              className="input"
              value={options.count}
              onChange={(e) => setOptions({ count: Number(e.target.value) })}
              disabled={loading}
            >
              {[20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} músicas
                </option>
              ))}
            </select>
          </Field>
          <Field label="Idioma">
            <select
              className="input"
              value={options.language}
              onChange={(e) => setOptions({ language: e.target.value as never })}
              disabled={loading}
            >
              <option value="qualquer">Qualquer idioma</option>
              <option value="portugues">Português</option>
              <option value="ingles">Inglês</option>
              <option value="espanhol">Espanhol</option>
              <option value="misto">Misto</option>
            </select>
          </Field>
          <Field label="Popularidade">
            <select
              className="input"
              value={options.popularity}
              onChange={(e) => setOptions({ popularity: e.target.value as never })}
              disabled={loading}
            >
              <option value="famosas">Famosas</option>
              <option value="menos_conhecidas">Menos conhecidas</option>
              <option value="misto">Misto</option>
            </select>
          </Field>
          <Field label="Energia">
            <select
              className="input"
              value={options.energy}
              onChange={(e) => setOptions({ energy: e.target.value as never })}
              disabled={loading}
            >
              <option value="qualquer">Qualquer</option>
              <option value="calma">Calma</option>
              <option value="media">Média</option>
              <option value="alta">Animada</option>
              <option value="intensa">Intensa</option>
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap gap-3 mt-5">
          <Toggle
            active={options.discoveryMode}
            onClick={() => setOptions({ discoveryMode: !options.discoveryMode })}
            icon={<Compass className="w-4 h-4" />}
            label="Modo Descoberta"
            hint="artistas/músicas menos óbvios"
          />
          <Toggle
            active={options.safeMode}
            onClick={() => setOptions({ safeMode: !options.safeMode })}
            icon={<Shield className="w-4 h-4" />}
            label="Modo Seguro"
            hint="evitar faixas explícitas"
          />
        </div>

        <div className="flex items-center justify-between gap-3 mt-6">
          <p className="text-xs text-white/45 hidden md:block">
            Dica: quanto mais detalhes (época, idioma, ocasião), melhor o resultado.
          </p>
          <button onClick={generate} disabled={loading} className="btn-primary">
            {loading ? <Spinner label="Gerando..." /> : (
              <>
                <Wand2 className="w-4 h-4" />
                Gerar playlist com IA
              </>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-4">
        <InfoCard
          icon={<Sparkles className="w-4 h-4" />}
          title="Como funciona"
          text="A IA pensa em músicas, artistas, época e clima. Depois o app procura cada uma no Spotify e cria a playlist."
        />
        <InfoCard
          icon={<Compass className="w-4 h-4" />}
          title="Modo Descoberta"
          text="Em vez dos hits, a IA busca artistas e faixas que você provavelmente não conhece dentro do mesmo estilo."
        />
        <InfoCard
          icon={<Shield className="w-4 h-4" />}
          title="Modo Seguro"
          text="Filtra faixas marcadas como explícitas pelo Spotify quando esse dado estiver disponível."
        />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-4 py-2.5 border transition text-left ${
        active
          ? "bg-spotify-green/15 border-spotify-green/40 text-spotify-green"
          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
      }`}
    >
      <span>{icon}</span>
      <span>
        <span className="block text-sm">{label}</span>
        <span className="block text-[11px] opacity-70">{hint}</span>
      </span>
    </button>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 text-spotify-green mb-1">
        {icon}
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-sm text-white/65">{text}</p>
    </div>
  );
}
