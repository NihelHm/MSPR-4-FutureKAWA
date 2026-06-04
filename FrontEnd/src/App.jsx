// ==========================================================
// APP.JSX - ROUTING + AUTH GUARD
// ==========================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PaysDetail from "./pages/PaysDetail";
import LotDetail from "./pages/LotDetail";
import LotForm from "./pages/LotForm";
import Alertes from "./pages/Alertes";
import Capteurs from "./pages/Capteurs";
import Reglages from "./pages/Reglages";
import styles from "./App.module.css";

function ProtectedLayout() {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alertes" element={<Alertes />} />
          <Route path="/reglages" element={<Reglages />} />
          <Route path="/pays/:paysId" element={<PaysDetail />} />
          <Route path="/pays/:paysId/capteurs" element={<Capteurs />} />
          <Route path="/pays/:paysId/lots/nouveau" element={<LotForm />} />
          <Route path="/pays/:paysId/lots/:lotId" element={<LotDetail />} />
          <Route path="/pays/:paysId/lots/:lotId/edit" element={<LotForm />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useApp();
  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
