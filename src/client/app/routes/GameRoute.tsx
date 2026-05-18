import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { getStoredPlayerName } from "../client-session.ts";
import { appRoutes } from "../routes.ts";
import { useDocumentTitle } from "../use-document-title.ts";
import {
  createGameSession,
  type GameConnectionStatus,
  type GameSession,
  type GameUiEvent,
  type LocalPlayerHudSnapshot,
} from "../../game/game-session.ts";

interface GameRouteParams {
  gameId?: string;
}

interface GameRouteContentProps {
  gameId: string;
  playerName: string;
}

export function GameRoute(): React.JSX.Element {
  const { gameId } = useParams() as GameRouteParams;
  const playerName = getStoredPlayerName();
  useDocumentTitle("Game - Multiplayer");

  if (!playerName) {
    return <Navigate to={appRoutes.landing.path} replace />;
  }

  if (!gameId) {
    return <Navigate to={appRoutes.lobby.path} replace />;
  }

  return <GameRouteContent gameId={gameId} playerName={playerName} />;
}

function GameRouteContent(
  { gameId, playerName }: GameRouteContentProps,
): React.JSX.Element {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionRef = useRef<GameSession | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    GameConnectionStatus
  >("connecting");
  const [playerCount, setPlayerCount] = useState(0);
  const [localPlayerHud, setLocalPlayerHud] = useState<
    LocalPlayerHudSnapshot | null
  >(null);
  const [isMuted, setIsMuted] = useState(false);
  const [winnerName, setWinnerName] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const handleUiEvent = useCallback((event: GameUiEvent): void => {
    if (event.type === "connection_changed") {
      setConnectionStatus(event.status);
      return;
    }

    if (event.type === "player_count_changed") {
      setPlayerCount(event.playerCount);
      return;
    }

    if (event.type === "local_player_hud_changed") {
      setLocalPlayerHud(event.hud);
      return;
    }

    if (event.type === "muted_changed") {
      setIsMuted(event.isMuted);
      return;
    }

    if (event.type === "game_over") {
      setWinnerName(event.winnerName);
      return;
    }

    if (event.type === "return_countdown_changed") {
      setRemainingSeconds(event.remainingSeconds);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setPlayerCount(0);
    setConnectionStatus("connecting");
    setLocalPlayerHud(null);
    setIsMuted(false);
    setWinnerName(null);
    setRemainingSeconds(null);

    const session = createGameSession({
      canvas,
      gameId,
      playerName,
      onUiEvent: handleUiEvent,
      onReturnToLobby() {
        navigate(appRoutes.lobby.path, { replace: true });
      },
    });

    sessionRef.current = session;
    session.start();

    return () => {
      session.dispose();
      if (sessionRef.current === session) {
        sessionRef.current = null;
      }
    };
  }, [gameId, handleUiEvent, navigate, playerName]);

  function leaveGame(): void {
    sessionRef.current?.leaveGame();
    navigate(appRoutes.lobby.path);
  }

  function toggleMuted(): void {
    sessionRef.current?.toggleMuted();
  }

  return (
    <main className="game-page">
      <canvas ref={canvasRef} className="game-canvas"></canvas>

      <nav className="game-nav" aria-label="Game actions">
        <span className="game-player-count">
          {playerCount} player{playerCount === 1 ? "" : "s"}
        </span>
        <button
          className="game-mute-button"
          type="button"
          title="Toggle sound"
          onClick={toggleMuted}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
        <button
          className="game-mute-button"
          type="button"
          onClick={leaveGame}
        >
          Back to lobby
        </button>
      </nav>

      <GameHud hud={localPlayerHud} connectionStatus={connectionStatus} />

      <div className={`game-overlay${winnerName ? " visible" : ""}`}>
        <h2>{winnerName ? `🏆 ${winnerName} wins!` : ""}</h2>
        <p>
          {remainingSeconds !== null
            ? `Returning to lobby in ${remainingSeconds}s…`
            : ""}
        </p>
      </div>
    </main>
  );
}

interface GameHudProps {
  hud: LocalPlayerHudSnapshot | null;
  connectionStatus: GameConnectionStatus;
}

function GameHud({ hud, connectionStatus }: GameHudProps): React.JSX.Element {
  return (
    <section className="game-hud" aria-label="Player status">
      {connectionStatus === "disconnected"
        ? <div className="game-status-banner">Disconnected</div>
        : null}

      {hud
        ? (
          <>
            <div className="game-hud-row">
              <span>Ammo</span>
              <div className="game-ammo" aria-label={`${hud.ammo} bullets`}>
                {Array.from({ length: 6 }, (_, index) => (
                  <span
                    className={`game-ammo-dot${
                      index < hud.ammo ? " filled" : ""
                    }`}
                    key={index}
                  >
                  </span>
                ))}
              </div>
            </div>

            <div className="game-hud-callout">
              {hud.reloading ? "Reloading" : ""}
            </div>

            <div className="game-hud-row">
              <span>Kills</span>
              <strong>{hud.kills}</strong>
            </div>
          </>
        )
        : <div className="game-hud-callout">Joining</div>}
    </section>
  );
}
