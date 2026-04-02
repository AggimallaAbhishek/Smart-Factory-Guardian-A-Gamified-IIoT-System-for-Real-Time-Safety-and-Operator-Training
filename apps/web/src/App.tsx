import { AnimatePresence } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { LobbyPage } from "./pages/LobbyPage";
import { ResultPage } from "./pages/ResultPage";
import { RoomLayout } from "./pages/RoomLayout";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomId" element={<RoomLayout />}>
          <Route path="lobby" element={<LobbyPage />} />
          <Route path="game" element={<GamePage />} />
          <Route path="result" element={<ResultPage />} />
          <Route index element={<Navigate to="lobby" replace />} />
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
