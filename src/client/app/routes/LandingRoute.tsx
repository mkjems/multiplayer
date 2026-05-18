import { Link } from "react-router";
import { appRoutes } from "../routes.ts";

export function LandingRoute(): React.JSX.Element {
  return (
    <main className="card">
      <h1>Multiplayer</h1>
      <p className="subtitle">Pick a name and jump into a game</p>
      <p className="subtitle">
        Landing behavior will move here in the next sprint.
      </p>
      <Link to={appRoutes.lobby.path}>Open lobby route</Link>
    </main>
  );
}
