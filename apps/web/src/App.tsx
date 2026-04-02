import { AnimatePresence } from "framer-motion";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { LobbyPage } from "./pages/LobbyPage";
import { ResultPage } from "./pages/ResultPage";
import { RoomLayout } from "./pages/RoomLayout";
import { useAuthContext } from "./features/auth/AuthContext";
import { TerminalShell } from "./components/ui/TerminalShell";

function RequireAuth() {
  const auth = useAuthContext();
  const location = useLocation();

  if (auth.loading) {
    return (
      <TerminalShell frameClassName="max-w-md">
        <div className="my-auto text-center text-sm uppercase tracking-[0.22em] text-tech-blue/70">Authorizing terminal...</div>
      </TerminalShell>
    );
  }

  if (!auth.user) {
    const redirectTarget = location.pathname + location.search;
    return <Navigate to="/login" replace state={{ redirectTo: redirectTarget }} />;
  }

  return <Outlet />;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:roomId" element={<RoomLayout />}>
            <Route path="lobby" element={<LobbyPage />} />
            <Route path="game" element={<GamePage />} />
            <Route path="result" element={<ResultPage />} />
            <Route index element={<Navigate to="lobby" replace />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
