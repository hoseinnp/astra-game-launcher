export type GameVibe =
  | 'auto'
  | 'cyberpunk'
  | 'souls-fantasy'
  | 'retro-arcade'
  | 'tactical-military'
  | 'anime-stylized'
  | 'cozy-wholesome'
  | 'modern-cinematic'
  | 'horror-survival'
  | 'racing-motorsport'
  | 'western-outlaw'
  | 'stealth-espionage'
  | 'space-cosmic'
  | 'post-apocalyptic'
  | 'sports-arena';

export interface GameTheme {
  accentColor: string;
  glowColor: string;
  bannerUrl?: string;
  logoUrl?: string;
  badgeColor?: string;
  vibe?: GameVibe;
}

export interface GameAudio {
  bgmUrl?: string;
  bgmVolume?: number;
  hoverSfx?: string;
  launchSfx?: string;
}

export interface GameStats {
  playtimeMinutes: number;
  lastPlayed?: string;
  playCount: number;
}

export type GameCollection = 'playing' | 'backlog' | 'completed' | 'none';

export interface HltbStats {
  gameId?: number;
  gameName?: string;
  mainStoryHours: number;
  mainExtraHours: number;
  completionistHours: number;
  allStylesHours?: number;
}

export interface GameMetadata {
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  rating?: number;
  metacritic?: number;
  screenshots?: string[];
  hltb?: HltbStats;
}

export interface GameCompatibility {
  runAsAdmin?: boolean;
  displayMode?: 'fullscreen' | 'windowed' | 'borderless';
  directX?: 'default' | 'dx11' | 'dx12' | 'vulkan';
  resolution?: string;
}

export interface GameQuote {
  text: string;
  speaker?: string;
}

export interface GameAchievement {
  id: string;
  title: string;
  description: string;
  type: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlocked: boolean;
  unlockedAt?: string;
  icon?: string;
}

export interface Game {
  id: string;
  title: string;
  version?: string;
  executablePath: string;
  workingDirectory?: string;
  launchArguments?: string;
  type: 'standalone' | 'steam' | 'epic' | 'gog' | 'ubisoft' | 'ea' | 'emulator' | 'other';
  coverUrl: string;
  backdropUrl?: string;
  videoUrl?: string; // Looping video scene (MP4/WebM)
  description?: string;
  quote?: GameQuote;
  genres: string[];
  tags: string[];
  favorite: boolean;
  collection?: GameCollection;
  metadata?: GameMetadata;
  hltb?: HltbStats;
  compatibility?: GameCompatibility;
  achievements?: GameAchievement[];
  theme: GameTheme;
  audio?: GameAudio;
  stats: GameStats;
  notes?: string;
  checklists?: { id: string; text: string; done: boolean }[];
  hidden?: boolean;
  mods?: GameMod[];
  modPresets?: ModPackPreset[];
  modsEnabledOnLaunch?: boolean;
}

export type ModCategory = 'graphics' | 'gameplay' | 'audio' | 'ui' | 'qol' | 'overhaul' | 'other';

export interface GameMod {
  id: string;
  name: string;
  version?: string;
  author?: string;
  category: ModCategory;
  enabled: boolean;
  priority: number; // load order (1 = highest priority)
  installDate?: string;
  description?: string;
  fileOrFolder?: string;
  sizeBytes?: number;
}

export interface ModPackPreset {
  id: string;
  name: string;
  description?: string;
  activeModIds: string[];
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  tag: string;
  avatarUrl: string;
  theme: GlobalTheme;
  isHost?: boolean;
}

export type ViewMode = 'ps5' | 'grid' | 'shelf';
export type GlobalTheme = 'ps5-dark' | 'cyberpunk' | 'oled-minimal' | 'retro-arcade' | '8bitdo-mint' | 'starfield-cosmic' | 'analog-collector';
export type ExperienceArchetype = 'analog' | 'digital' | 'cosmic';

export interface ProviderApiKeys {
  steamGridDb?: string;
  rawg?: string;
}

export interface AppSettings {
  viewMode: ViewMode;
  globalTheme: GlobalTheme;
  sfxEnabled: boolean;
  sfxVolume: number;
  bgmEnabled: boolean;
  bgmVolume: number;
  minimizeOnLaunch: boolean;
  customGameFolder?: string;
  apiKeys?: ProviderApiKeys;
  backgroundBlur?: 'none' | 'subtle' | 'medium' | 'heavy';
  discordRpcEnabled?: boolean;
  skipStartupScreen?: boolean;
  startOnBoot?: boolean;
  autoDownloadLiveWallpaper?: boolean;
  liveWallpaperQuality?: '1080p' | '480p';
  liveWallpaperEngine?: 'ambient' | 'steam';
  showNavigationHud?: boolean;
  autoSaveBackupOnLaunch?: boolean;
  jukeboxVolume?: number;
  jukeboxDuckingEnabled?: boolean;
  hasCompletedOnboarding?: boolean;
  experienceArchetype?: ExperienceArchetype;
  hapticsEnabled?: boolean;
}

export interface FolderScanResult {
  title: string;
  executablePath: string;
  directory: string;
  sizeMB?: string;
  version?: string;
}

export interface SteamGameInfo {
  appId: string;
  title: string;
  installDir: string;
  headerUrl: string;
  backdropUrl: string;
  logoUrl?: string;
}

export type PlatformId = 'steam' | 'epic' | 'gog' | 'ubisoft' | 'ea';

export interface DetectedPlatformGame {
  platformId: PlatformId;
  platformName: string;
  gameId: string;
  title: string;
  executablePath: string;
  installDir: string;
  headerUrl?: string;
  backdropUrl?: string;
  logoUrl?: string;
  version?: string;
}

export interface DiscordActivity {
  state?: string;
  details?: string;
  startTimestamp?: number;
  largeImageKey?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageText?: string;
  timestamps?: {
    start?: number;
    end?: number;
  };
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
}

export interface ScreenshotCaptureOptions {
  gameTitle?: string;
  gameId?: string;
  copyToClipboard?: boolean;
}

export interface ScreenshotResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  dataUrl?: string;
  sizeBytes?: number;
  error?: string;
}

export interface JukeboxTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  durationSeconds: number;
  url: string;
  source: 'curated' | 'local' | 'synthesizer' | 'radio';
  vibe?: GameVibe;
  coverUrl?: string;
}

export type VisualizerMode = 'bars' | 'wave' | 'pulsar';
export type AmbientLoFiLayer = 'rain' | 'vinyl' | 'space' | 'fireplace';

export interface SaveSnapshot {
  id: string;
  gameId: string;
  gameTitle: string;
  timestamp: string;
  note?: string;
  sizeBytes: number;
  fileCount: number;
  archivePath: string;
  isAutoBackup?: boolean;
}

export interface SaveLocation {
  path: string;
  source: 'saved_games' | 'documents' | 'appdata' | 'custom';
  exists: boolean;
  lastModified?: string;
}

export interface GamingSession {
  id: string;
  gameId: string;
  gameTitle: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  date: string; // YYYY-MM-DD
}

export interface ActivityMatrixDay {
  date: string;
  count: number;
  durationMinutes: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  sessions: GamingSession[];
}

export type RetroPlatform = 'nes' | 'snes' | 'gba' | 'gbc' | 'genesis' | 'ps1' | 'ps2' | 'ps3' | 'n64' | 'gamecube' | 'nds' | 'arcade';

export interface EmulatorConfig {
  id: string;
  name: string;
  executablePath: string;
  platforms: RetroPlatform[];
  defaultArgs: string;
  installed: boolean;
}

export interface RomScanItem {
  id: string;
  title: string;
  romPath: string;
  platform: RetroPlatform;
  fileSizeBytes: number;
  extension: string;
  suggestedEmulator?: string;
}

export interface SystemPerformanceStats {
  cpuUsage: number;
  ramUsedGB: number;
  ramTotalGB: number;
  ramPercent: number;
  uptimeHours: number;
}

export interface ElectronAPI {
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  toggleFullscreen: () => Promise<boolean>;
  setFullscreen: (flag: boolean) => Promise<boolean>;
  isFullscreen: () => Promise<boolean>;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<{ success: boolean; openAtLogin?: boolean; error?: string }>;
  pickExe: () => Promise<string | null>;
  pickImage: () => Promise<string | null>;
  pickAudio: () => Promise<string | null>;
  pickVideo: () => Promise<string | null>;
  pickFolder: {
    (): Promise<string | null>;
    (options: { multi: true }): Promise<string[] | null>;
    (options: { multi: false }): Promise<string | null>;
    (options?: { multi?: boolean }): Promise<string | string[] | null>;
  };
  getExeVersion: (exePath: string) => Promise<string | null>;
  checkGameVersion: (exePath: string) => Promise<{
    version: string | null;
    lastModified: string | null;
    fileSizeBytes?: number;
    exists: boolean;
  }>;
  launchGame: (game: Game) => Promise<{ success: boolean; pid?: number; error?: string; mode?: string }>;
  openGameFolder: (game: Game) => Promise<{ success: boolean; error?: string }>;
  createDesktopShortcut?: (game: Game) => Promise<{ success: boolean; path?: string; error?: string }>;
  createAppDesktopShortcut?: () => Promise<{ success: boolean; path?: string; error?: string }>;
  scanFolder: (dirPath: string | string[], options?: { smartFilter?: boolean }) => Promise<FolderScanResult[]>;
  scanSteam: () => Promise<SteamGameInfo[]>;
  scanPlatformGames: (platform?: PlatformId) => Promise<DetectedPlatformGame[]>;
  loadData: () => Promise<{ games: Game[]; settings: AppSettings } | null>;
  saveData: (data: { games: Game[]; settings: AppSettings }) => Promise<{ success: boolean }>;
  downloadLiveWallpaper: (options: {
    title: string;
    gameId: string;
    quality?: '1080p' | '480p';
    sceneQuery?: string;
    forceAmbient?: boolean;
  }) => Promise<{
    success: boolean;
    localPath?: string;
    sizeBytes?: number;
    source?: string;
    error?: string;
  }>;
  downloadVideo: (options: { url: string; gameId: string; title?: string }) => Promise<{ success: boolean; localPath?: string; sizeBytes?: number; error?: string }>;
  getVideoStorage: () => Promise<{ totalSizeBytes: number; count: number }>;
  deleteVideo: (gameId: string) => Promise<{ success: boolean; error?: string }>;
  clearVideoCache: () => Promise<{ success: boolean; freedBytes: number; error?: string }>;
  downloadSteamAssets: (appId: string | number) => Promise<{ coverUrl?: string; backdropUrl?: string; logoUrl?: string }>;
  downloadFile: (url: string, filename?: string) => Promise<string | null>;
  fetchHltb: (title: string) => Promise<HltbStats | null>;
  captureScreenshot: (options?: ScreenshotCaptureOptions) => Promise<ScreenshotResult>;
  openScreenshotsFolder: (gameTitle?: string) => Promise<{ success: boolean; error?: string }>;
  pickScreenshot: () => Promise<string[] | null>;
  onScreenshotCaptured: (callback: (result: ScreenshotResult) => void) => () => void;
  onScreenshotTriggered: (callback: () => void) => () => void;
  setDiscordActivity: (activity: DiscordActivity) => Promise<boolean>;
  clearDiscordActivity: () => Promise<void>;
  onGameSessionEnded: (callback: (info: { gameId: string; durationMinutes: number; endedAt: string; startedAt?: string }) => void) => () => void;
  // Save Vault APIs
  scanSaveLocations?: (gameId: string, gameTitle: string) => Promise<SaveLocation[]>;
  createSaveSnapshot?: (gameId: string, gameTitle: string, note?: string, isAuto?: boolean) => Promise<{ success: boolean; snapshot?: SaveSnapshot; error?: string }>;
  listSaveSnapshots?: (gameId: string) => Promise<SaveSnapshot[]>;
  restoreSaveSnapshot?: (gameId: string, snapshotId: string) => Promise<{ success: boolean; error?: string }>;
  listBackups?: (gameId: string, customStorage?: string) => Promise<any[]>;
  createBackup?: (params: {
    gameId: string;
    gameTitle: string;
    savePath?: string;
    notes?: string;
    gameVersion?: string;
    isAuto?: boolean;
    retentionCount?: number;
    customStorage?: string;
  }) => Promise<{ success: boolean; backup?: any; error?: string }>;
  restoreBackup?: (params: { gameId: string; backupId: string; customStorage?: string }) => Promise<{ success: boolean; restoredPath?: string; error?: string }>;
  deleteBackup?: (params: { gameId: string; backupId: string; customStorage?: string }) => Promise<{ success: boolean; error?: string }>;
  pickSaveStorageFolder?: () => Promise<string | null>;
  openSaveDirectory?: (gameId: string, customStorage?: string) => Promise<{ success: boolean; path?: string }>;
  onSaveVaultProgress?: (callback: (info: { gameId: string; progress: number }) => void) => () => void;
  // Activity History APIs
  getActivityLog?: () => Promise<GamingSession[]>;
  recordActivitySession?: (session: GamingSession) => Promise<{ success: boolean }>;
  // Retro Emulation Hub APIs
  detectEmulators?: () => Promise<EmulatorConfig[]>;
  scanRoms?: (folderPath: string) => Promise<RomScanItem[]>;
  // System Performance APIs
  getSystemPerformance?: () => Promise<SystemPerformanceStats>;
}

declare global {
  interface Window {
    api?: ElectronAPI;
  }
}

