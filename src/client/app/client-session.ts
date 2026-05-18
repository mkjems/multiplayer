const playerNameStorageKey = "playerName";

export function getStoredPlayerName(): string | null {
  const playerName = sessionStorage.getItem(playerNameStorageKey)?.trim() ??
    null;
  return playerName && playerName.length > 0 ? playerName : null;
}

export function storePlayerName(playerName: string): void {
  const trimmedPlayerName = playerName.trim();
  if (trimmedPlayerName.length === 0) {
    throw new Error("Cannot store an empty player name");
  }

  sessionStorage.setItem(playerNameStorageKey, trimmedPlayerName);
}

export function clearStoredPlayerName(): void {
  sessionStorage.removeItem(playerNameStorageKey);
}
