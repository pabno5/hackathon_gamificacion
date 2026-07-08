import { NavLink } from "react-router-dom";
import { useAuth } from "../../lib/authContext";

type NavItem = { to: string; label: string; roles: string[] };

// En Inc 1 solo existen dashboard y agenda. Se agregan más items al crearse
// las rutas (citas/pacientes/historias en Inc 2+).
const ITEMS: NavItem[] = [
  { to: "/portal/dashboard", label: "Dashboard", roles: ["admin"] },
  { to: "/portal/agenda", label: "Agenda", roles: ["admin", "medico", "recepcionista"] },
];

// data-feature-id ancla el tour (tour.factory emite [data-feature-id="..."]).
// El id de "Agenda" depende del rol: R-06 recepción, M-02 médico, A-07 admin.
function featureIdFor(to: string, rol: string): string | undefined {
  if (to === "/portal/dashboard") return "A-02";
  if (to === "/portal/agenda") {
    if (rol === "medico") return "M-02";
    if (rol === "recepcionista") return "R-06";
    return "A-07";
  }
  return undefined;
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
