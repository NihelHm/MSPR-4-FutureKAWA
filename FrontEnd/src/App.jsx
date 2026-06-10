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

// Garde : l'utilisateur a-t-il accès à ce pays ?
function PaysGuard({ children }) {
  const { paysId } = useParams();
  const { user } = useApp();
  if (!canAccessPays(user, paysId)) {
    return (
      <div className={styles.guard}>
        <ErrorBox message={`Accès refusé : votre rôle ne permet pas de consulter « ${paysId} ».`} />
      </div>
    );
  }
  return children;
}

// Garde : réservé aux administrateurs (is_admin)
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
          <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />

          <Route path="/pays/:paysId" element={<PaysGuard><PaysDetail /></PaysGuard>} />
          <Route path="/pays/:paysId/capteurs" element={<PaysGuard><Capteurs /></PaysGuard>} />
          <Route path="/pays/:paysId/sites/:siteId" element={<PaysGuard><SiteDetail /></PaysGuard>} />
          <Route path="/pays/:paysId/lots/nouveau" element={<PaysGuard><LotForm /></PaysGuard>} />
          <Route path="/pays/:paysId/lots/:lotId" element={<PaysGuard><LotDetail /></PaysGuard>} />
          <Route path="/pays/:paysId/lots/:lotId/edit" element={<PaysGuard><LotForm /></PaysGuard>} />

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
