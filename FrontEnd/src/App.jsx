// ==========================================================
// APP.JSX — ROUTING + GARDES (AUTH / RÔLE PAYS / ADMIN)
// ==========================================================

import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { canAccessPays } from "./constants/pays";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PaysDetail from "./pages/PaysDetail";
import SiteDetail from "./pages/SiteDetail";
import LotDetail from "./pages/LotDetail";
import LotForm from "./pages/LotForm";
import Alertes from "./pages/Alertes";
import Capteurs from "./pages/Capteurs";
import Reglages from "./pages/Reglages";
import Admin from "./pages/Admin";
import { ErrorBox } from "./components/UI";
import styles from "./App.module.css";

// Garde : accès à un pays selon le périmètre du rôle.
function PaysGuard({ children }) {
  const { paysId } = useParams();
  const { user } = useApp();
  if (!canAccessPays(user, paysId)) {
    return (
      <div className={styles.guard}>
        <ErrorBox message={`Accès refusé : votre rôle ne permet pas de consulter ce pays.`} />
      </div>
    );
  }
  return children;
}

// Garde : pages réservées aux administrateurs.
function AdminGuard({ children }) {
  const { isAdmin } = useApp();
  if (!isAdmin) {
    return (
      <div className={styles.guard}>
        <ErrorBox message="Accès refusé : page réservée aux administrateurs." />
      </div>
    );
  }
  return children;
}

// Garde : pages MÉTIER interdites à l'administrateur fonctionnel.
// Un admin n'a pas de périmètre métier → on le renvoie vers l'administration.
function MetierGuard({ children }) {
  const { isAdmin } = useApp();
  if (isAdmin) return <Navigate to="/admin" replace />;
  return children;
}

function ProtectedLayout() {
  const { user, isAdmin } = useApp();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.main}>
        <Routes>
          {/* Accueil : siège pour le métier, administration pour l'admin */}
          <Route path="/" element={isAdmin ? <Navigate to="/admin" replace /> : <Dashboard />} />

          <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
          <Route path="/reglages" element={<Reglages />} />

          {/* Routes métier — inaccessibles à l'admin */}
          <Route path="/alertes" element={<MetierGuard><Alertes /></MetierGuard>} />
          <Route path="/pays/:paysId" element={<MetierGuard><PaysGuard><PaysDetail /></PaysGuard></MetierGuard>} />
          <Route path="/pays/:paysId/capteurs" element={<MetierGuard><PaysGuard><Capteurs /></PaysGuard></MetierGuard>} />
          <Route path="/pays/:paysId/sites/:siteId" element={<MetierGuard><PaysGuard><SiteDetail /></PaysGuard></MetierGuard>} />
          <Route path="/pays/:paysId/lots/nouveau" element={<MetierGuard><PaysGuard><LotForm /></PaysGuard></MetierGuard>} />
          <Route path="/pays/:paysId/lots/:lotId" element={<MetierGuard><PaysGuard><LotDetail /></PaysGuard></MetierGuard>} />
          <Route path="/pays/:paysId/lots/:lotId/edit" element={<MetierGuard><PaysGuard><LotForm /></PaysGuard></MetierGuard>} />

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
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
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