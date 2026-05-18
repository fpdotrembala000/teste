// Shared TypeScript types for the app.

export type Energy = "calma" | "media" | "alta" | "intensa";
export type LanguagePref = "qualquer" | "portugues" | "ingles" | "espanhol" | "misto";
export type PopularityPref = "famosas" | "menos_conhecidas" | "misto";

// Song produced by the AI (before being matched to Spotify).
export interface AISong {
  title: string;
  artist: string;
  reason?: string;
  energy?: string;
  genre?: string;
  approxYear?: number;
}

// Result of an AI playlist generation call.
export interface AIPlaylist {
  playlistName: string;
  description: string;
  coverIdea?: string;
  songs: AISong[];
}

// Song already matched to Spotify (with URI).
export interface MatchedSong extends AISong {
  matched: boolean;
  spotifyUri?: string;
  spotifyId?: string;
  spotifyUrl?: string;
  albumImage?: string;
  durationMs?: number;
  explicit?: boolean;
}

// Options the user can tweak when generating a playlist.
export interface PlaylistOptions {
  count: number; // 20, 30, 50, 100
  language: LanguagePref;
  popularity: PopularityPref;
  energy: Energy | "qualquer";
  discoveryMode: boolean;
  safeMode: boolean; // skip explicit
}

// History entry stored locally.
export interface HistoryEntry {
  id: string;
  prompt: string;
  playlistName: string;
  createdAt: number;
  songCount: number;
  spotifyUrl?: string;
}

// Spotify minimal types used in the app.
export interface SpotifyImage {
  url: string;
  height?: number | null;
  width?: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images?: SpotifyImage[];
  genres?: string[];
  popularity?: number;
  external_urls?: { spotify: string };
}

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: SpotifyImage[];
    release_date?: string;
  };
  duration_ms: number;
  explicit: boolean;
  popularity?: number;
  external_urls?: { spotify: string };
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  images?: SpotifyImage[];
  product?: string;
}

export interface PlaylistAnalysis {
  totalTracks: number;
  uniqueArtists: number;
  topArtists: { name: string; count: number }[];
  topGenres: { name: string; count: number }[];
  yearDistribution: { decade: string; count: number }[];
  avgPopularity: number;
  explicitRatio: number;
  sampleTracks: { title: string; artist: string }[];
}
