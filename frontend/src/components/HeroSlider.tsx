import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import image1 from "figma:asset/cda12ece160b21947d9650aba927cfd4197c57ba.png";
import image2 from "figma:asset/6c501743924c167a065891faff596b76e0bb3a89.png";
import image3 from "figma:asset/ff1e6d366e21d85ea85c6111243559274f0ec1dc.png";

const slides = [
  {
    id: 1,
    image: image1,
    title: "La experiencia y la tecnología se unen para cuidar tu visión.",
    description: "Equipos de última generación y profesionales especializados para tu bienestar"
  },
  {
    id: 2,
    image: image2,
    title: "Tu salud visual, en manos de expertos.",
    description: "Tu visión es nuestro compromiso. Diagnóstico y tratamiento personalizado"
  },
  {
    id: 3,
    image: image3,
    title: "Innovación, precisión y cuidado en cada mirada.",
    description: "Más de 10 años cuidando la salud visual de nuestras familias"
  }
];

export function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative h-[600px] overflow-hidden" id="inicio">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <img 
            src={slide.image} 
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#03D4D9]/80 via-[#01EDDF]/60 to-transparent"></div>
          
          {/* Content */}
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="max-w-2xl text-white">
                <h1 className="mb-6 text-5xl font-bold">{slide.title}</h1>
                <p className="text-xl mb-8 text-white/90">{slide.description}</p>
                <button className="bg-white text-[#03D4D9] px-8 py-3 rounded-full hover:bg-gray-100 transition-colors">
                  Conocer más
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 text-white p-3 rounded-full transition-colors backdrop-blur-sm"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/30 hover:bg-white/50 text-white p-3 rounded-full transition-colors backdrop-blur-sm"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentSlide ? "bg-white w-8" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
