// ═════════════════════════════════════════════════════════════════════════════
// Game Constants
// ═════════════════════════════════════════════════════════════════════════════

// Color palette — canvas/JS colors (CSS equivalents live in game.html :root)
export const COLOR_GROUND = "#232121";
export const COLOR_ROCK_FILL = "#4a4a5a";
export const COLOR_ROCK_STROKE = "#6a6a7a";
export const COLOR_CACTUS_FILL = "#2d7a2d";
export const COLOR_CACTUS_STROKE = "#1a5c1a";
export const COLOR_HEALTH_BG = "#333";
export const COLOR_HEALTH_HIGH = "#2ecc71";
export const COLOR_HEALTH_MID = "#f39c12";
export const COLOR_HEALTH_LOW = "#e74c3c";
export const COLOR_BULLET_FILL = "#f9ca24";
export const COLOR_BULLET_STROKE = "#f0932b";
export const COLOR_AMMO_FULL = "#f9ca24";
export const COLOR_AMMO_EMPTY = "#333";
export const COLOR_HUD_LABEL = "#888";
export const COLOR_RELOAD_TEXT = "#f39c12";
export const COLOR_KILLS_ACTIVE = "#f9ca24";
export const COLOR_KILLS_ZERO = "#555";
export const COLOR_PLAYER_NAME = "#fff";
export const COLOR_PLAYER_KILLS = "#f9ca24";
export const COLOR_PLAYER_DEAD = "#555555";
export const COLOR_PLAYER_DEAD_NAME = "#777";
export const COLOR_DISCONNECT_BG = "#0f0f1a"; // matches --color-bg-page
export const COLOR_DISCONNECT_TEXT = "#888"; // matches --color-text-secondary
export const COLOR_HIT_FLASH = "#ffffff";
export const COLOR_VIGNETTE = "220,50,50";

// Gameplay geometry defaults. Server-provided arena config should override these.
export const DEFAULT_WORLD_WIDTH = 3000;
export const DEFAULT_WORLD_HEIGHT = 2000;
export const DEFAULT_CACTUS_HALF_WIDTH = 8;
export const DEFAULT_CACTUS_SEGMENT_STRIDE = 14;
export const DEFAULT_CACTUS_SEGMENT_WIDTH = 16;
export const DEFAULT_CACTUS_SEGMENT_HEIGHT = 14;

// Arm and weapon defaults. Server-provided arena config should override these.
export const DEFAULT_ARM_LENGTH = 20;
export const DEFAULT_ARM_MAX = Math.PI / 3;
export const ARM_STEP = (2 * Math.PI) / 180; // 2° per frame

// Animation and visual effect timings (milliseconds)
export const HIT_FLASH_DURATION = 300;
export const SHAKE_DURATION = 400;
export const SHAKE_MAGNITUDE = 5; // max pixel offset
export const VIGNETTE_DURATION = 600;

// Bullet trail
export const TRAIL_MAX_POSITIONS = 8; // positions per bullet (at 20 Hz ≈ 400 ms of history)

// Camera dead zone: fraction of viewport in which the player can move without scrolling
export const CAMERA_DEAD_ZONE_FRACTION = 0;

// Minimap
export const MINIMAP_WIDTH_DESKTOP = 150;
export const MINIMAP_WIDTH_MOBILE = 90;
export const MINIMAP_MOBILE_BREAKPOINT = 768;
export const MINIMAP_MARGIN = 12;
export const MINIMAP_NAVBAR_HEIGHT = 44;
export const MINIMAP_BACKGROUND_OPACITY = 0.55;
export const MINIMAP_BORDER_RADIUS = 4;
export const MINIMAP_LOCAL_DOT_RADIUS = 3.5;
export const MINIMAP_OTHER_DOT_RADIUS = 2.5;
export const COLOR_MINIMAP_BG = "#0f0f1a";
export const COLOR_MINIMAP_BORDER = "#555555";
export const COLOR_MINIMAP_LOCAL_PLAYER = "#e0e0e0";
export const COLOR_MINIMAP_OTHER_PLAYER_ALIVE = "#888888";
export const COLOR_MINIMAP_OTHER_PLAYER_DEAD = "#3a3a3a";
