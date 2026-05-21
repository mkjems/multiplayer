import { useNavigate } from "react-router";
import { getStoredPlayerName } from "../client-session.ts";
import { RequirePlayerName } from "../components/RequirePlayerName.tsx";
import { WesternParallaxBackground } from "../components/westernParallaxBackground.tsx";
import { GamesList } from "../lobby/GamesList.tsx";
import { KeyboardControls } from "../lobby/KeyboardControls.tsx";
import { useLobbyConnection } from "../lobby/use-lobby-connection.ts";
import { appRoutes } from "../routes.ts";
import { useDocumentTitle } from "../use-document-title.ts";

export function LobbyRoute(): React.JSX.Element {
  useDocumentTitle("Lobby - Multiplayer");

  return (
    <RequirePlayerName>
      <LobbyContent />
    </RequirePlayerName>
  );
}

function LobbyContent(): React.JSX.Element {
  const navigate = useNavigate();
  const playerName = getStoredPlayerName();
  const lobbyState = useLobbyConnection();

  function joinGame(gameId: string): void {
    navigate(appRoutes.game.path(gameId));
  }

  return (
      <main className="lobby-page">
        <header className="lobby-header">
          <h1>
            Multiplayer <span className="live-badge">LIVE</span>
          </h1>
          <div className="player-info">
            <div className="player-name">
              <span>{lobbyState.lobbyCount}</span> in lobby
            </div>
            <div className="player-name">
              Playing as <span>{playerName}</span>
            </div>
          </div>
        </header>

        <h2 className="lobby-section-title">Choose a game</h2>
        <KeyboardControls />
        <GamesList
          games={lobbyState.games}
          status={lobbyState.status}
          onJoinGame={joinGame}
        />
      </main>
  );
}
