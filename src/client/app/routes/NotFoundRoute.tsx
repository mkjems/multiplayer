import { Link } from "react-router";
import { appRoutes } from "../routes.ts";
import { useDocumentTitle } from "../use-document-title.ts";

export function NotFoundRoute(): React.JSX.Element {
  useDocumentTitle("Not found - Multiplayer");

  return (
    <main className="card">
      <h1>Not found</h1>
      <p className="subtitle">That route is not part of the app.</p>
      <Link to={appRoutes.landing.path}>Back to landing</Link>
    </main>
  );
}
