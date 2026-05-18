import { Link } from "react-router";
import { appRoutes } from "../routes.ts";

export function LobbyRoute(): React.JSX.Element {
  return (
    <main className="card">
      <h1>Lobby</h1>
      <p className="subtitle">The lobby UI migrates to React in Sprint 30.</p>
      <Link to={appRoutes.landing.path}>Back to landing</Link>
    </main>
  );
}
