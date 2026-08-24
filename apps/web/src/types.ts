export type GameStatus = 'playing' | 'completed' | 'backlog' | 'dropped';
export type ThemePreference = 'system' | 'light' | 'dark';

export const STATUS_LABELS: Record<GameStatus, string> = {
  playing: 'Playing',
  completed: 'Completed',
  backlog: 'Backlog',
  dropped: 'Dropped',
};

export const STATUS_ORDER: GameStatus[] = ['playing', 'completed', 'backlog', 'dropped'];

/** Accent per play state. Values reference the theme-tuned --status-* custom
 *  properties in styles.css so spines, dots, and washes adapt to light mode. */
export const STATUS_COLORS: Record<GameStatus, { core: string; soft: string }> = {
  playing: { core: 'var(--status-playing)', soft: 'var(--status-playing-soft)' },
  completed: { core: 'var(--status-completed)', soft: 'var(--status-completed-soft)' },
  backlog: { core: 'var(--status-backlog)', soft: 'var(--status-backlog-soft)' },
  dropped: { core: 'var(--status-dropped)', soft: 'var(--status-dropped-soft)' },
};

/** View model consumed by pages (camelCase, presentation-ready). */
export interface RigItem { id: string; category: string; name: string; detail: string; accent?: string; }
export interface Award { id: string; title: string; gameId: string; note: string; year?: number; }
export interface Game {
  id: string;
  igdbId?: number;
  slug: string;
  title: string;
  cover: string;
  banner?: string | null;
  rating: number | null;
  platform: string;
  status: GameStatus;
  review: string;
  startedAt?: string;
  completedAt?: string;
  hours: number;
  genres: string[];
  platforms: string[];
  year?: number;
  summary?: string;
  award?: string;
  awardNote?: string;
  featured?: boolean;
  featuredOrder?: number | null;
  featuredNote?: string | null;
}
export interface Profile {
  handle: string;
  displayName: string;
  bio: string;
  location: string;
  avatar: string;
  banner: string;
  since: number;
  themePreference: ThemePreference;
  isPublic: boolean;
  rig: RigItem[];
  rigHero?: string;
  games: Game[];
  awards: Award[];
  featuredOrder: string[];
}

export interface GuideResponse { answer: string; }

/* ---- Raw API DTOs mirroring apps/api/app/schemas.py (snake_case) ---- */

export interface ApiProfileSummary {
  id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  theme_preference: ThemePreference;
  location: string | null;
  social_links: Record<string, string>;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}
export interface ApiMonitor {
  display_name: string; brand_model?: string | null; size_inches?: number | null;
  resolution?: string | null; refresh_hz?: number | null; photo_url?: string | null;
}
export interface ApiRig {
  id: string; profile_id: string; name: string; hero_photo_url: string | null; monitors: ApiMonitor[];
  cpu?: string | null; gpu?: string | null; motherboard?: string | null; memory?: string | null; storage?: string | null;
  case?: string | null; psu?: string | null; cooling?: string | null; os?: string | null; notes?: string | null;
}
export interface ApiPeripheral {
  id: string; profile_id: string; type: string; display_name: string; brand_model: string | null;
  photo_url: string | null; notes: string | null; sort_order: number;
}
export interface ApiGameMeta {
  igdb_id: number; name: string; slug: string; summary: string | null; cover_url: string | null;
  banner_url?: string | null;
  release_date: string | null; genres: string[]; platforms: string[]; snapshot_at?: string;
}
export interface ApiProfileGame {
  id: string; profile_id: string; game: ApiGameMeta; status: GameStatus; rating: number | null;
  review: string | null; hours_played: number | null; started_on: string | null; completed_on: string | null;
  platform: string | null; featured: boolean; featured_order: number | null; featured_note: string | null;
}
export interface ApiAward {
  id: string; profile_id: string; profile_game_id: string; title: string; description: string | null;
  icon_url: string | null; awarded_on: string | null; sort_order: number;
}
export interface ApiPublicProfile {
  profile: ApiProfileSummary; rig: ApiRig | null; peripherals: ApiPeripheral[];
  games: ApiProfileGame[]; awards: ApiAward[];
}
export interface ApiIGDBResult {
  igdb_id: number; name: string; slug: string; summary: string | null; cover_url: string | null;
  banner_url?: string | null;
  release_date: string | null; genres: string[]; platforms: string[];
}

export interface GameEntryInput {
  igdb_id: number; status: GameStatus; rating: number | null; review: string | null; hours_played: number | null;
  started_on: string | null; completed_on: string | null; platform: string | null;
  featured: boolean; featured_order: number | null; featured_note: string | null;
}
export type GameEntryPatch = Partial<Omit<GameEntryInput, 'igdb_id'>>;
export interface PeripheralInput {
  type: string; display_name: string; brand_model: string | null; photo_url: string | null;
  notes: string | null; sort_order: number;
}
export interface AwardInput { profile_game_id: string; title: string; description: string | null; awarded_on: string | null; sort_order: number; }
export interface MePatch {
  handle?: string; display_name?: string; bio?: string | null; avatar_url?: string | null;
  theme_preference?: ThemePreference; location?: string | null; social_links?: Record<string, string>; is_public?: boolean;
}

/** Transport-agnostic data surface. Demo mode implements the same contract locally. */
export interface SavepointClient {
  publicProfile(handle: string, signal?: AbortSignal): Promise<Profile>;
  createMe(input: { handle: string; display_name: string; bio?: string | null }): Promise<{ created: boolean }>;
  me(signal?: AbortSignal): Promise<ApiPublicProfile>;
  patchMe(patch: MePatch): Promise<void>;
  putRig(rig: Partial<Omit<ApiRig, 'id' | 'profile_id'>>): Promise<void>;
  createPeripheral(input: PeripheralInput): Promise<void>;
  updatePeripheral(id: string, input: PeripheralInput): Promise<void>;
  deletePeripheral(id: string): Promise<void>;
  searchIgdb(query: string, signal?: AbortSignal): Promise<ApiIGDBResult[]>;
  addGame(input: GameEntryInput): Promise<void>;
  patchGame(id: string, patch: GameEntryPatch): Promise<void>;
  deleteGame(id: string): Promise<void>;
  createAward(input: AwardInput): Promise<void>;
  deleteAward(id: string): Promise<void>;
  uploadMedia(purpose: 'avatar' | 'rig' | 'peripheral', file: File): Promise<string>;
  guide(handle: string, question: string, signal?: AbortSignal): Promise<GuideResponse>;
}
