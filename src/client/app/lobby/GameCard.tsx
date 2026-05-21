import type { GameInfo } from "../../../shared/protocol";
import styles from "./GameCard.module.css";

interface GameCardProps {
  game: GameInfo;
  onJoinGame(gameId: string): void;
}

function getGameStatusLabel(game: GameInfo): string {
  if (game.playerCount >= game.maxPlayers) return "Full";
  return game.status === "waiting" ? "Waiting for players" : "In progress";
}

export function GameCard(
  { game, onJoinGame }: GameCardProps,
): React.JSX.Element {
  const isFull = game.playerCount >= game.maxPlayers;
  const statusClassName = game.status === "waiting"
    ? `${styles.statusDot} ${styles.waiting}`
    : styles.statusDot;

  return (
    <button
      className={`${styles.gameCard}${isFull ? ` ${styles.full}` : ""}`}
      type="button"
      disabled={isFull}
      onClick={() => onJoinGame(game.id)}
    >
      <div className={styles.gameName}>{game.name}</div>
      <div className={styles.gameMeta}>
        <span className={statusClassName}></span>
        <span>{getGameStatusLabel(game)}</span>
        <span className={styles.playerCount}>
          {game.playerCount} / {game.maxPlayers}
        </span>
      </div>
    </button>
  );
}
