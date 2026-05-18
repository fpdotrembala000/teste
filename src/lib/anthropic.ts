import Anthropic from "@anthropic-ai/sdk";
import { aiPlaylistSchema } from "./validators";
import { safeParseJson } from "./utils";
import type { AIPlaylist, PlaylistOptions } from "@/types";

export class AnthropicError extends Error {}

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AnthropicError(
      "ANTHROPIC_API_KEY não configurada. Adicione no .env.local"
    );
  }
  return new Anthropic({ apiKey });
}

// Default model. You can override it with ANTHROPIC_MODEL in .env.local.
// We try the configured model first, then fall back to a list of well-known
// model ids if the API returns 404 (e.g. account doesn't have access to that
// specific snapshot). Cheapest+fastest option that works for this task is
// Haiku — Sonnet is also great but more expensive.
const PRIMARY_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
const FALLBACK_MODELS = [
  "claude-haiku-4-5",
  "claude-sonnet-4-5",
  "claude-3-5-haiku-latest",
  "claude-3-5-sonnet-latest",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022",
];

interface GenerateArgs {
  prompt: string;
  options: PlaylistOptions;
  avoid?: { title: string; artist: string }[];
  tweak?: string;
  // When provided, instructs the AI to keep these and only add more songs.
  keepExisting?: { title: string; artist: string }[];
  // Override count when only adding songs.
  addCount?: number;
  // Optional pre-built analysis (used by inspiration flow).
  inspirationContext?: string;
}

const SYSTEM_PROMPT = `Você é um curador musical experiente que monta playlists para o Spotify.
Você responde SEMPRE com JSON válido, sem texto adicional, sem comentários, sem markdown.
Você conhece muita música em vários idiomas, gêneros e épocas.
Você nunca inventa nomes de músicas ou artistas: use apenas obras que realmente existem.
Você evita duplicatas e respeita rigorosamente a quantidade de músicas pedida.
O JSON deve seguir exatamente este formato:
{
  "playlistName": "string criativa e curta",
  "description": "string curta (até 200 caracteres)",
  "coverIdea": "ideia visual em uma frase para a capa",
  "songs": [
    {
      "title": "Nome exato da música",
      "artist": "Nome do artista principal",
      "reason": "Por que combina com a playlist",
      "energy": "calma | media | alta | intensa",
      "genre": "gênero aproximado",
      "approxYear": 2003
    }
  ]
}`;

function buildUserPrompt(args: GenerateArgs): string {
  const { prompt, options, avoid, tweak, keepExisting, addCount, inspirationContext } =
    args;
  const lines: string[] = [];

  if (inspirationContext) {
    lines.push("CONTEXTO DE INSPIRAÇÃO (análise de playlists existentes):");
    lines.push(inspirationContext);
    lines.push("");
  }

  lines.push(`Pedido do usuário: ${prompt}`);
  lines.push("");
  lines.push("Preferências:");
  lines.push(`- Quantidade de músicas: exatamente ${addCount ?? options.count}`);
  lines.push(`- Idioma preferido: ${options.language}`);
  lines.push(`- Popularidade: ${options.popularity}`);
  lines.push(`- Energia: ${options.energy}`);
  if (options.discoveryMode) {
    lines.push(
      "- Modo Descoberta ATIVO: prefira artistas e faixas menos óbvios, mas que combinem com o estilo."
    );
  }
  if (options.safeMode) {
    lines.push("- Modo Seguro ATIVO: evite músicas com letras explícitas/profanidade.");
  }

  if (tweak) {
    lines.push("");
    lines.push(`Ajuste solicitado: ${tweak}`);
  }

  if (keepExisting && keepExisting.length) {
    lines.push("");
    lines.push("Mantenha contexto das músicas já presentes (NÃO repita):");
    keepExisting.slice(0, 60).forEach((s) => lines.push(`- ${s.title} — ${s.artist}`));
  }

  if (avoid && avoid.length) {
    lines.push("");
    lines.push("NÃO sugira NENHUMA destas músicas (o usuário removeu):");
    avoid.slice(0, 60).forEach((s) => lines.push(`- ${s.title} — ${s.artist}`));
  }

  lines.push("");
  lines.push("Crie um nome criativo, curto e memorável para a playlist.");
  lines.push("Retorne APENAS o JSON descrito no formato.");

  return lines.join("\n");
}

// Build the ordered list of models we will try.
function modelCandidates(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of [PRIMARY_MODEL, ...FALLBACK_MODELS]) {
    if (m && !seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}

async function callModel(userPrompt: string): Promise<string> {
  const client = getClient();
  const candidates = modelCandidates();
  let lastErr: unknown = null;
  for (const model of candidates) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        temperature: 0.85,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });
      const part = response.content.find((c) => c.type === "text");
      if (!part || part.type !== "text") throw new AnthropicError("Resposta vazia da IA");
      return part.text;
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      // Auth errors: don't bother trying other models.
      if (msg.toLowerCase().includes("api key") || msg.includes("401")) {
        throw new AnthropicError("Chave da Anthropic inválida ou ausente.");
      }
      // Model not found / not available for this account: try next one.
      const isModelNotFound =
        msg.includes("404") ||
        msg.toLowerCase().includes("not_found") ||
        msg.toLowerCase().includes("model:");
      if (isModelNotFound) {
        // eslint-disable-next-line no-console
        console.warn(`[anthropic] modelo "${model}" indisponível, tentando próximo...`);
        continue;
      }
      // Other errors: surface immediately.
      throw new AnthropicError(`Erro ao chamar Anthropic: ${msg}`);
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new AnthropicError(
    `Nenhum modelo Anthropic disponível na sua conta. Configure ANTHROPIC_MODEL em .env.local. Último erro: ${msg}`
  );
}

// Generate a playlist via the AI. Will retry with a stricter instruction once
// if the first response is not valid JSON.
export async function generatePlaylistAI(args: GenerateArgs): Promise<AIPlaylist> {
  const userPrompt = buildUserPrompt(args);
  let raw = await callModel(userPrompt);
  let parsed = safeParseJson<unknown>(raw);
  let validated = aiPlaylistSchema.safeParse(parsed);

  if (!validated.success) {
    // Retry once with a strict reminder.
    raw = await callModel(
      userPrompt +
        "\n\nIMPORTANTE: sua resposta anterior não estava em JSON válido. Responda APENAS com JSON puro, no formato exato exigido."
    );
    parsed = safeParseJson<unknown>(raw);
    validated = aiPlaylistSchema.safeParse(parsed);
  }

  if (!validated.success) {
    throw new AnthropicError(
      "A IA não retornou um JSON válido após duas tentativas. Tente novamente."
    );
  }

  // Trim to requested count.
  const desired = args.addCount ?? args.options.count;
  const data = validated.data;
  if (data.songs.length > desired) data.songs = data.songs.slice(0, desired);

  // De-duplicate by title|artist.
  const seen = new Set<string>();
  data.songs = data.songs.filter((s) => {
    const key = `${s.title.toLowerCase().trim()}|${s.artist.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return data;
}
