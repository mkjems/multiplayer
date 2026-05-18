export interface StaticRouteDefinition {
  pattern: string;
  path: string;
}

export interface GameRouteDefinition {
  pattern: string;
  path(gameId: string): string;
}

export interface AppRoutes {
  landing: StaticRouteDefinition;
  lobby: StaticRouteDefinition;
  game: GameRouteDefinition;
  diagnostics: StaticRouteDefinition;
}

function encodeRouteParameter(value: string): string {
  return encodeURIComponent(value);
}

export const appRoutes: AppRoutes = {
  landing: {
    pattern: "/",
    path: "/",
  },
  lobby: {
    pattern: "/lobby",
    path: "/lobby",
  },
  game: {
    pattern: "/game/:gameId",
    path(gameId: string): string {
      return `/game/${encodeRouteParameter(gameId)}`;
    },
  },
  diagnostics: {
    pattern: "/diagnostics",
    path: "/diagnostics",
  },
};
