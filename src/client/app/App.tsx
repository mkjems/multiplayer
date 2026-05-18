import { BrowserRouter, Route, Routes } from "react-router";
import { appRoutes } from "./routes.ts";
import { DiagnosticsRoute } from "./routes/DiagnosticsRoute.tsx";
import { GameRoute } from "./routes/GameRoute.tsx";
import { LandingRoute } from "./routes/LandingRoute.tsx";
import { LobbyRoute } from "./routes/LobbyRoute.tsx";
import { NotFoundRoute } from "./routes/NotFoundRoute.tsx";

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={appRoutes.landing.pattern} element={<LandingRoute />} />
        <Route path={appRoutes.lobby.pattern} element={<LobbyRoute />} />
        <Route path={appRoutes.game.pattern} element={<GameRoute />} />
        <Route
          path={appRoutes.diagnostics.pattern}
          element={<DiagnosticsRoute />}
        />
        <Route path="*" element={<NotFoundRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
