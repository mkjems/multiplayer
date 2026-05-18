import type { GameInfo } from "../../../shared/protocol";

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
    ? "status-dot waiting"
    : "status-dot";

  return (
    <button
      className={`game-card${isFull ? " full" : ""}`}
      type="button"
      disabled={isFull}
      onClick={() => onJoinGame(game.id)}
    >
      <div className="game-name">{game.name}</div>
      <div className="game-meta">
        <span className={statusClassName}></span>
        <span>{getGameStatusLabel(game)}</span>
        <span className="player-count">
          {game.playerCount} / {game.maxPlayers}
        </span>
      </div>
    </button>
  );
}
