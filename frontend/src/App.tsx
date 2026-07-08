import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Navbar } from "./components/Navbar";
import { HeroSlider } from "./components/HeroSlider";
import { ServicesSection } from "./components/ServicesSection";
import { EPSSection } from "./components/EPSSection";
import { AppointmentChatSection } from "./components/AppointmentChatSection";
import { ChatBot } from "./components/ChatBot";
import { Footer } from "./components/Footer";
import { LoginPage } from "./components/LoginPage";
import { Toaster } from "./components/ui/sonner";
import CalendarioPage from "./pages/CalendarioPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ContrastToggle from "./components/ContrastToggle";
import ProtectedRoute from "./components/ProtectedRoute";
import PortalLayout from "./components/portal/PortalLayout";
import { AuthProvider, useAuth } from "./lib/authContext";

function HomePage() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen">
      {/* Contrast toggle only on the main home page */}
      <ContrastToggle />
      <Navbar 
        onLoginClick={() => navigate("/login")}
        onAgendarClick={() => navigate("/calendario")}
      />
      <HeroSlider />
      <ServicesSection />
      <EPSSection />
      <AppointmentChatSection />
      <ChatBot />
      <Footer />
    </div>
  );
}

function LoginPageWrapper() {
  const navigate = useNavigate();

  // BOT-01: el chatbot es SOLO para la landing pública, no en el portal de empleados.
  return <LoginPage onBack={() => navigate("/")} />;
}

// Home por rol. En Inc 1 solo existen dashboard y agenda, así que médico y
// recepción van a agenda; el mapa final (recepción→citas) llega en Inc 2/3.
function PortalIndexRedirect() {
  const { rol, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Verificando acceso…</div>
      </div>
    );
  }
  if (rol === "admin") return <Navigate to="/portal/dashboard" replace />;
  if (rol === "medico" || rol === "recepcionista") return <Navigate to="/portal/agenda" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPageWrapper />} />

        {/* Portal de empleados: shell + rutas por rol */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute>
              <PortalLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PortalIndexRedirect />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="agenda" element={<CalendarioPage />} />
        </Route>

        {/* Compat: rutas viejas redirigen a las nuevas */}
        <Route path="/admin" element={<Navigate to="/portal/dashboard" replace />} />
        <Route path="/calendario" element={<Navigate to="/portal/agenda" replace />} />
      </Routes>
      <Toaster />
      </AuthProvider>
    </Router>
  );
}