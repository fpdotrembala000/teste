import { z } from "zod";

// Schema for the JSON we expect from the AI when generating a playlist.
export const aiSongSchema = z.object({
  title: z.string().min(1),
  artist: z.string().min(1),
  reason: z.string().optional().default(""),
  energy: z.string().optional().default(""),
  genre: z.string().optional().default(""),
  approxYear: z.number().int().optional(),
});

export const aiPlaylistSchema = z.object({
  playlistName: z.string().min(1),
  description: z.string().min(1),
  coverIdea: z.string().optional().default(""),
  songs: z.array(aiSongSchema).min(1),
});

// Validate playlist generation request body.
export const generatePlaylistRequestSchema = z.object({
  prompt: z.string().min(3, "Descreva melhor a playlist"),
  count: z.number().int().min(5).max(100).default(30),
  language: z
    .enum(["qualquer", "portugues", "ingles", "espanhol", "misto"])
    .default("qualquer"),
  popularity: z
    .enum(["famosas", "menos_conhecidas", "misto"])
    .default("misto"),
  energy: z.enum(["qualquer", "calma", "media", "alta", "intensa"]).default("qualquer"),
  discoveryMode: z.boolean().default(false),
  safeMode: z.boolean().default(false),
  // Songs to avoid (e.g. previously removed by user).
  avoid: z
    .array(z.object({ title: z.string(), artist: z.string() }))
    .optional()
    .default([]),
  // Used when regenerating: tweak the existing playlist with hints.
  tweak: z.string().optional(),
});

export const inspirationRequestSchema = z.object({
  playlistUrls: z.array(z.string().url()).min(1).max(3),
  variation: z
    .enum([
      "muito_parecida",
      "variada",
      "mais_famosas",
      "menos_obvias",
      "mais_animada",
      "mais_calma",
    ])
    .default("variada"),
  count: z.number().int().min(5).max(100).default(30),
  safeMode: z.boolean().default(false),
});

export const createSpotifyPlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).default(""),
  isPublic: z.boolean().default(false),
  songs: z
    .array(
      z.object({
        title: z.string(),
        artist: z.string(),
      })
    )
    .min(1),
  safeMode: z.boolean().default(false),
});
