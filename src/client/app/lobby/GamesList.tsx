import type { GameInfo } from "../../../shared/protocol";
import type { LobbyConnectionStatus } from "./use-lobby-connection.ts";
import { GameCard } from "./GameCard.tsx";
import styles from "./GamesList.module.css";

interface GamesListProps {
  games: GameInfo[];
  status: LobbyConnectionStatus;
  onJoinGame(gameId: string): void;
}

function getEmptyMessage(status: LobbyConnectionStatus): string {
  if (status === "connecting") return "Connecting to lobby...";
  if (status === "disconnected") {
    return "Lost connection to lobby. Refresh to reconnect.";
  }
  return "No games available.";
}

export function GamesList(
  { games, status, onJoinGame }: GamesListProps,
): React.JSX.Element {
  if (status !== "connected" || games.length === 0) {
    return <div className={styles.loading}>{getEmptyMessage(status)}</div>;
  }

  return (
    <div className={styles.games}>
      {games.map((game) => (
        <GameCard game={game} key={game.id} onJoinGame={onJoinGame} />
      ))}
    </div>
  );
}
