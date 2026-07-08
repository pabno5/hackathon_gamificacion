import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { authAPI } from "../service/api";

type Perfil = {
  id_empleado?: string;
  rol?: string;
  nombres?: string;
  apellidos?: string;
  [k: string]: unknown;
} | null;

type AuthState = {
  user: Perfil;
  rol: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  rol: null,
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Perfil>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarPerfil = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        setUser(null);
        setRol(null);
        return;
      }
      const { data } = await authAPI.profile();
      const perfil = (data?.data ?? null) as Perfil;
      setUser(perfil);
      setRol(perfil?.rol ?? null);
    } catch {
      setUser(null);
      setRol(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPerfil();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setRol(null);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        cargarPerfil();
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [cargarPerfil]);

  return (
    <AuthContext.Provider value={{ user, rol, loading, refresh: cargarPerfil }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
