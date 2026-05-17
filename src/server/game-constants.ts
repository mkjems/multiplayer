export const MAX_SPEED = 10;
export const ACCELERATION = 1;
export const IDLE_DRAG = 0;
export const STOP_SPEED = 0.05;
export const BULLET_SPEED = 22;
export const TICK_MS = 50;
export const MAX_SOCKET_BUFFERED_BYTES = 256 * 1024;
export const METRICS_AVERAGE_WEIGHT = 0.12;
export const PLAYER_RADIUS = 16;
export const BULLET_RADIUS = 4;
export const SHOOT_COOL_DOWN = 400;
export const RELOAD_TIME = 2000;
export const ARENA_W = 2000;
export const ARENA_H = 1500;
export const ARM_MAX = Math.PI / 3;
export const ARM_LENGTH = 20;
export const MAX_ENERGY = 100;
export const RATE_OF_ENERGY_LOSS_PR_DISTANCE = 0.12;
export const RATE_OF_ENERGY_REGAIN_PR_TIME = 18;

// Arena generation: rock placement
export const ROCK_COUNT = 25;
export const ROCK_MIN_SIDES = 6;
export const ROCK_EXTRA_SIDES = 5;
export const ROCK_MIN_RADIUS = 20;
export const ROCK_MAX_RADIUS = 95;
export const FALLBACK_ROCK_COLS = 5;
export const FALLBACK_ROCK_ORIGIN_X = 200;
export const FALLBACK_ROCK_COL_STEP = 600;
export const FALLBACK_ROCK_ORIGIN_Y = 300;
export const FALLBACK_ROCK_ROW_STEP = 700;
export const FALLBACK_ROCK_MAX_RADIUS = 35;
export const FALLBACK_ROCK_SIDES = 5;

// Arena generation: cactus placement
export const CACTUS_COUNT = 30;
export const CACTUS_PLACEMENT_RADIUS = 18;
export const CACTUS_PLACEMENT_MARGIN_Y = 60;
export const FALLBACK_CACTUS_COLS = 5;
export const FALLBACK_CACTUS_ORIGIN_X = 300;
export const FALLBACK_CACTUS_COL_STEP = 500;
export const FALLBACK_CACTUS_ORIGIN_Y = 400;
export const FALLBACK_CACTUS_ROW_STEP = 800;

// Arena generation: shared placement
export const PLACEMENT_MAX_ATTEMPTS = 60;
export const OBJECT_MIN_SPACING = 40;
export const ARENA_PLACEMENT_MARGIN = 120;

// Cactus segment geometry, shared by collision and rendering payloads
export const CACTUS_SEGMENT_COUNT = 5;
export const CACTUS_HALF_WIDTH = 8;
export const CACTUS_SEGMENT_STRIDE = 14;
export const CACTUS_SEGMENT_WIDTH = 16;
export const CACTUS_SEGMENT_HEIGHT = 14;
