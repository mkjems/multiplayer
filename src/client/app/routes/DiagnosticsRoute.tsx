import { Link } from "react-router";
import { appRoutes } from "../routes.ts";
import { useDocumentTitle } from "../use-document-title.ts";

export function DiagnosticsRoute(): React.JSX.Element {
  useDocumentTitle("Diagnostics - Multiplayer");

  return (
    <main className="card">
      <h1>Diagnostics</h1>
      <p className="subtitle">
        Diagnostics will move into this route after the core game flow is on the
        SPA shell.
      </p>
      <Link to={appRoutes.landing.path}>Back to landing</Link>
    </main>
  );
}
