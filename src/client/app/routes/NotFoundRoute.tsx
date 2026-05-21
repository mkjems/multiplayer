import { Link } from "react-router";
import { appRoutes } from "../routes.ts";
import { useDocumentTitle } from "../use-document-title.ts";
import styles from "./NotFoundRoute.module.css";

export function NotFoundRoute(): React.JSX.Element {
  useDocumentTitle("Not found - Multiplayer");

  return (
    <main className={styles.card}>
      <h1>Not found</h1>
      <p className={styles.subtitle}>That route is not part of the app.</p>
      <Link to={appRoutes.landing.path}>Back to landing</Link>
    </main>
  );
}
