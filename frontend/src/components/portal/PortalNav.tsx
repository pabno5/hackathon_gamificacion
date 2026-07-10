import { NavLink } from "react-router-dom";
import { useAuth } from "../../lib/authContext";

type NavItem = { to: string; label: string; roles: string[] };

const ITEMS: NavItem[] = [
  { to: "/portal/inicio", label: "Inicio", roles: ["admin", "medico", "recepcionista"] },
  { to: "/portal/dashboard", label: "Dashboard", roles: ["admin"] },
  { to: "/portal/agenda", label: "Agenda", roles: ["admin", "medico", "recepcionista"] },
  { to: "/portal/citas", label: "Citas", roles: ["admin", "recepcionista"] },
  { to: "/portal/pacientes", label: "Pacientes", roles: ["admin", "recepcionista"] },
  { to: "/portal/historias", label: "Historias", roles: ["admin", "medico"] },
  { to: "/portal/admin", label: "Administración", roles: ["admin"] },
];

// data-feature-id ancla el tour (tour.factory emite [data-feature-id="..."]).
// Ids según Anexo A del PRD; los compartidos varían por rol.
function featureIdFor(to: string, rol: string): string | undefined {
  switch (to) {
    case "/portal/inicio":
      return rol === "medico" ? "M-01" : rol === "recepcionista" ? "R-01" : "A-01";
    case "/portal/dashboard":
      return "A-02";
    case "/portal/agenda":
      return rol === "medico" ? "M-02" : rol === "recepcionista" ? "R-06" : "A-07";
    case "/portal/citas":
      return rol === "recepcionista" ? "R-04" : undefined;
    case "/portal/pacientes":
      return rol === "recepcionista" ? "R-02" : undefined;
    case "/portal/historias":
      return rol === "medico" ? "M-03" : undefined;
    case "/portal/admin":
      return "A-03";
    default:
      return undefined;
  }
}

export default function PortalNav() {
  const { rol } = useAuth();
  if (!rol) return null;
  const visibles = ITEMS.filter((i) => i.roles.includes(rol));
  return (
    <nav className="flex gap-2">
      {visibles.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          data-feature-id={featureIdFor(i.to, rol)}
          className={({ isActive }) =>
            `px-4 py-2 rounded-full text-sm transition-colors ${
              isActive ? "bg-[#03D4D9] text-white" : "text-gray-600 hover:bg-gray-100"
            }`
          }
        >
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
}
