"use client";

import { Info, KeyRound } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { usePlaylistStore } from "@/store/usePlaylistStore";
import { toast } from "@/components/Toaster";

const REDIRECT_URI = "http://127.0.0.1:3000/api/auth/spotify/callback";

export default function SettingsPage() {
  const { options, setOptions } = usePlaylistStore();

  return (
    <div>
      <SectionHeader
        title="Configurações"
        subtitle="Preferências padrão do app e instruções para configurar suas chaves."
      />

      <div className="card mb-4 animate-slide-up">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-spotify-green" />
          Chaves de API
        </h3>
        <p className="text-sm text-white/65 mb-4">
          Por segurança, as chaves <b>nunca</b> ficam no navegador. Configure-as no
          arquivo <code className="text-white/85">.env.local</code> na raiz do projeto:
        </p>
        <pre className="bg-surface-800 border border-white/10 rounded-xl p-4 text-xs overflow-auto">
{`ANTHROPIC_API_KEY=...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REDIRECT_URI=${REDIRECT_URI}
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000`}
        </pre>
        <p className="text-xs text-white/50 mt-3">
          Depois de salvar o arquivo, reinicie o servidor com{" "}
          <code className="text-white/80">npm run dev</code>.
        </p>
      </div>

      <div className="card mb-4">
        <h3 className="text-sm font-medium mb-3">Redirect URI obrigatória</h3>
        <div className="flex items-center gap-2 bg-surface-800 border border-white/10 rounded-xl p-3 text-sm">
          <code className="flex-1 truncate">{REDIRECT_URI}</code>
          <button
            className="btn-ghost text-xs px-3 py-1.5"
            onClick={() => {
              navigator.clipboard.writeText(REDIRECT_URI);
              toast("Redirect URI copiada", "success");
            }}
          >
            Copiar
          </button>
        </div>
        <p className="text-xs text-white/50 mt-3 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 mt-0.5 text-spotify-green" /> Adicione exatamente
          essa URL em “Redirect URIs” no Spotify Developer Dashboard, no app que você
          criou. O Spotify exige <b>127.0.0.1</b> em vez de <b>localhost</b>.
        </p>
      </div>

      <div className="card">
        <h3 className="text-sm font-medium mb-3">Preferências padrão de playlist</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Quantidade padrão</label>
            <select
              className="input"
              value={options.count}
              onChange={(e) => setOptions({ count: Number(e.target.value) })}
            >
              {[20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} músicas
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Idioma padrão</label>
            <select
              className="input"
              value={options.language}
              onChange={(e) => setOptions({ language: e.target.value as never })}
            >
              <option value="qualquer">Qualquer</option>
              <option value="portugues">Português</option>
              <option value="ingles">Inglês</option>
              <option value="espanhol">Espanhol</option>
              <option value="misto">Misto</option>
            </select>
          </div>
          <div>
            <label className="label">Popularidade padrão</label>
            <select
              className="input"
              value={options.popularity}
              onChange={(e) => setOptions({ popularity: e.target.value as never })}
            >
              <option value="famosas">Famosas</option>
              <option value="menos_conhecidas">Menos conhecidas</option>
              <option value="misto">Misto</option>
            </select>
          </div>
          <div>
            <label className="label">Energia padrão</label>
            <select
              className="input"
              value={options.energy}
              onChange={(e) => setOptions({ energy: e.target.value as never })}
            >
              <option value="qualquer">Qualquer</option>
              <option value="calma">Calma</option>
              <option value="media">Média</option>
              <option value="alta">Animada</option>
              <option value="intensa">Intensa</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/75">
            <input
              type="checkbox"
              className="accent-spotify-green"
              checked={options.discoveryMode}
              onChange={(e) => setOptions({ discoveryMode: e.target.checked })}
            />
            Modo Descoberta por padrão
          </label>
          <label className="flex items-center gap-2 text-sm text-white/75">
            <input
              type="checkbox"
              className="accent-spotify-green"
              checked={options.safeMode}
              onChange={(e) => setOptions({ safeMode: e.target.checked })}
            />
            Modo Seguro por padrão (sem explícitas)
          </label>
        </div>
      </div>
    </div>
  );
}
