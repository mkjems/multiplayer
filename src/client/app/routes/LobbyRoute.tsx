import { Link } from "react-router";
import { getStoredPlayerName } from "../client-session.ts";
import { RequirePlayerName } from "../components/RequirePlayerName.tsx";
import { appRoutes } from "../routes.ts";
import { useDocumentTitle } from "../use-document-title.ts";

export function LobbyRoute(): React.JSX.Element {
  const playerName = getStoredPlayerName();
  useDocumentTitle("Lobby - Multiplayer");

  return (
    <RequirePlayerName>
      <main className="card">
        <h1>Lobby</h1>
        <p className="subtitle">
          Playing as {playerName}. The lobby UI migrates to React in Sprint 30.
        </p>
        <Link to={appRoutes.landing.path}>Back to landing</Link>
      </main>
    </RequirePlayerName>
  );
}
