declare const Deno: {
  test(name: string, testFunction: () => void | Promise<void>): void;
};

import {
  clearStoredPlayerName,
  getStoredPlayerName,
  storePlayerName,
} from "./client-session.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function installSessionStorage(): MemoryStorage {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: storage,
  });
  return storage;
}

Deno.test("client session stores trimmed player names", () => {
  const storage = installSessionStorage();

  storePlayerName("  Annie  ");

  assert(
    storage.getItem("playerName") === "Annie",
    "stored player name should be trimmed",
  );
  assert(
    getStoredPlayerName() === "Annie",
    "stored player name should be readable",
  );
});

Deno.test("client session treats missing and blank names as absent", () => {
  const storage = installSessionStorage();

  assert(getStoredPlayerName() === null, "missing player name should be null");

  storage.setItem("playerName", "   ");

  assert(getStoredPlayerName() === null, "blank player name should be null");
});

Deno.test("client session rejects empty names and clears stored names", () => {
  installSessionStorage();

  let didThrow = false;
  try {
    storePlayerName(" ");
  } catch {
    didThrow = true;
  }

  assert(didThrow, "empty player names should be rejected");

  storePlayerName("Casey");
  clearStoredPlayerName();

  assert(getStoredPlayerName() === null, "cleared player name should be null");
});
