import { Link, useParams } from "react-router";
import { RequirePlayerName } from "../components/RequirePlayerName.tsx";
import { appRoutes } from "../routes.ts";
import { useDocumentTitle } from "../use-document-title.ts";

interface GameRouteParams {
  gameId?: string;
}

export function GameRoute(): React.JSX.Element {
  const { gameId } = useParams() as GameRouteParams;
  useDocumentTitle("Game - Multiplayer");

  return (
    <RequirePlayerName>
      <main className="card">
        <h1>Game</h1>
        <p className="subtitle">
          Game route ready{gameId ? ` for ${gameId}` : ""}. The canvas session
          mounts here in Sprint 32.
        </p>
        <Link to={appRoutes.lobby.path}>Back to lobby</Link>
      </main>
    </RequirePlayerName>
  );
}
