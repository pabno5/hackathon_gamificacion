import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Navbar } from "./components/Navbar";
import { HeroSlider } from "./components/HeroSlider";
import { ServicesSection } from "./components/ServicesSection";
import { EPSSection } from "./components/EPSSection";
import { AppointmentChatSection } from "./components/AppointmentChatSection";
import { ChatBot } from "./components/ChatBot";
import { Footer } from "./components/Footer";
import LoginForm from "./components/auth/LoginForm";
import ResetPassword from "./components/auth/ResetPassword";
import { Toaster } from "./components/ui/sonner";
import CalendarioPage from "./pages/CalendarioPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import ContrastToggle from "./components/ContrastToggle";
import ProtectedRoute from "./components/ProtectedRoute";
import PortalLayout from "./components/portal/PortalLayout";
import PortalInicio from "./components/portal/PortalInicio";
import CitasFlow from "./components/portal/CitasFlow";
import HistoriasFlow from "./components/portal/HistoriasFlow";
import PacientesList from "./components/portal/PacientesList";
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

// BOT-01: el chatbot es SOLO para la landing pública, no en el portal de empleados.
function LoginPageWrapper() {
  return <LoginForm />;
}

// Home del portal: panel de inicio para todos los roles (feature R-01/M-01/A-01
// del tour = "visitar panel de inicio").
function PortalIndexRedirect() {
  const { rol, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Verificando acceso…</div>
      </div>
    );
  }
  if (rol) return <Navigate to="/portal/inicio" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPageWrapper />} />
        <Route path="/reset-password" element={<ResetPassword />} />

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
          <Route path="inicio" element={<PortalInicio />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="agenda" element={<CalendarioPage />} />
          <Route
            path="citas"
            element={
              <ProtectedRoute roles={["recepcionista", "admin"]}>
                <CitasFlow />
              </ProtectedRoute>
            }
          />
          <Route
            path="historias"
            element={
              <ProtectedRoute roles={["medico", "admin"]}>
                <HistoriasFlow />
              </ProtectedRoute>
            }
          />
          <Route
            path="pacientes"
            element={
              <ProtectedRoute roles={["recepcionista", "admin"]}>
                <PacientesList />
              </ProtectedRoute>
            }
          />
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