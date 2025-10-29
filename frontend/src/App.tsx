import { useState } from "react";
import { Navbar } from "./components/Navbar";
import { HeroSlider } from "./components/HeroSlider";
import { ServicesSection } from "./components/ServicesSection";
import { EPSSection } from "./components/EPSSection";
import { AppointmentChatSection } from "./components/AppointmentChatSection";
import { ChatBot } from "./components/ChatBot";
import { Footer } from "./components/Footer";
import { LoginPage } from "./components/LoginPage";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const [currentPage, setCurrentPage] = useState<"home" | "login">("home");

  if (currentPage === "login") {
    return (
      <>
        <LoginPage onBack={() => setCurrentPage("home")} />
        <ChatBot />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar onLoginClick={() => setCurrentPage("login")} />
      <HeroSlider />
      <ServicesSection />
      <EPSSection />
      <AppointmentChatSection />
      <ChatBot />
      <Footer />
      <Toaster />
    </div>
  );
}