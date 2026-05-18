"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AIPlaylist, AISong, HistoryEntry, PlaylistOptions } from "@/types";

interface PlaylistState {
  // Last AI-generated playlist that the user is reviewing.
  current?: AIPlaylist;
  options: PlaylistOptions;
  lastPrompt: string;
  // Songs the user manually removed (used to avoid re-suggesting).
  removed: { title: string; artist: string }[];
  history: HistoryEntry[];

  setCurrent: (p?: AIPlaylist) => void;
  updateCurrent: (patch: Partial<AIPlaylist>) => void;
  removeSong: (idx: number) => void;
  reorderSong: (from: number, to: number) => void;
  addSongs: (songs: AISong[]) => void;
  setOptions: (o: Partial<PlaylistOptions>) => void;
  setLastPrompt: (s: string) => void;
  clearRemoved: () => void;
  pushHistory: (h: HistoryEntry) => void;
  clearHistory: () => void;
}

export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set) => ({
      current: undefined,
      lastPrompt: "",
      removed: [],
      history: [],
      options: {
        count: 30,
        language: "qualquer",
        popularity: "misto",
        energy: "qualquer",
        discoveryMode: false,
        safeMode: false,
      },
      setCurrent: (p) => set({ current: p, removed: [] }),
      updateCurrent: (patch) =>
        set((s) => (s.current ? { current: { ...s.current, ...patch } } : {})),
      removeSong: (idx) =>
        set((s) => {
          if (!s.current) return {};
          const removed = s.current.songs[idx];
          const songs = s.current.songs.filter((_, i) => i !== idx);
          return {
            current: { ...s.current, songs },
            removed: removed
              ? [...s.removed, { title: removed.title, artist: removed.artist }]
              : s.removed,
          };
        }),
      reorderSong: (from, to) =>
        set((s) => {
          if (!s.current) return {};
          const songs = [...s.current.songs];
          const [m] = songs.splice(from, 1);
          songs.splice(to, 0, m);
          return { current: { ...s.current, songs } };
        }),
      addSongs: (newSongs) =>
        set((s) => {
          if (!s.current) return {};
          const existing = new Set(
            s.current.songs.map((x) => `${x.title}|${x.artist}`.toLowerCase())
          );
          const removedSet = new Set(
            s.removed.map((x) => `${x.title}|${x.artist}`.toLowerCase())
          );
          const filtered = newSongs.filter((x) => {
            const key = `${x.title}|${x.artist}`.toLowerCase();
            return !existing.has(key) && !removedSet.has(key);
          });
          return {
            current: {
              ...s.current,
              songs: [...s.current.songs, ...filtered],
            },
          };
        }),
      setOptions: (o) => set((s) => ({ options: { ...s.options, ...o } })),
      setLastPrompt: (s) => set({ lastPrompt: s }),
      clearRemoved: () => set({ removed: [] }),
      pushHistory: (h) =>
        set((s) => ({ history: [h, ...s.history].slice(0, 50) })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "ai-playlist-store",
      partialize: (s) => ({
        history: s.history,
        options: s.options,
        current: s.current,
        lastPrompt: s.lastPrompt,
        removed: s.removed,
      }),
    }
  )
);
