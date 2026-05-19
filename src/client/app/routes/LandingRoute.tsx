import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { HomeScreenSuggestion } from "../components/HomeScreenSuggestion.tsx";
import { WesternParallaxBackground } from "../components/westernParallaxBackground.tsx";
import { getStoredPlayerName, storePlayerName } from "../client-session.ts";
import { playLandingPageTune } from "../landingTune.ts";
import { appRoutes } from "../routes.ts";
import { useDocumentTitle } from "../use-document-title.ts";
import { notifyVisitor } from "../visitor.ts";

export function LandingRoute(): React.JSX.Element {
  const navigate = useNavigate();
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [playerName, setPlayerName] = useState(getStoredPlayerName() ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  useDocumentTitle("Multiplayer");

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const tunePlayback = playLandingPageTune({ repetitions: 3 });

    return () => {
      tunePlayback.stop();
    };
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const trimmedPlayerName = playerName.trim();
    if (!trimmedPlayerName || isSubmitting) return;

    setIsSubmitting(true);
    storePlayerName(trimmedPlayerName);

    try {
      await notifyVisitor(trimmedPlayerName);
    } catch (error) {
      console.error("Failed to notify visitor endpoint", error);
    }

    navigate(appRoutes.lobby.path);
  }

  return (
    <WesternParallaxBackground>
      <main className="landing-page">
        <section className="card">
          <h1>Gunfight</h1>
          <p className="subtitle">Pick a name and jump into a game</p>

          <HomeScreenSuggestion />

          <form onSubmit={(event) => void handleSubmit(event)}>
            <label htmlFor="name">Your name</label>
            <input
              ref={nameInputRef}
              type="text"
              id="name"
              placeholder="Enter your name..."
              maxLength={20}
              autoComplete="off"
              value={playerName}
              onChange={(event) => setPlayerName(event.currentTarget.value)}
            />

            <button
              className="primary-button"
              id="enter"
              type="submit"
              disabled={isSubmitting || playerName.trim().length === 0}
            >
              Enter Lobby
            </button>
          </form>
        </section>
      </main>
    </WesternParallaxBackground>
  );
}
