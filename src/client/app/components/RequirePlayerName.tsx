import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { getStoredPlayerName } from "../client-session.ts";
import { appRoutes } from "../routes.ts";

interface RequirePlayerNameProps {
  children: ReactNode;
}

export function RequirePlayerName(
  { children }: RequirePlayerNameProps,
): React.JSX.Element {
  const playerName = getStoredPlayerName();

  if (!playerName) {
    return <Navigate to={appRoutes.landing.path} replace />;
  }

  return <>{children}</>;
}
