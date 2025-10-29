import { auth } from "../config/firebase.config.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function login(email, password) {
  try {
    const credentials = await signInWithEmailAndPassword(auth, email, password);
    // Para obtener el token del usuario autenticado por Firebase Authentication:
    const token = await credentials.user.getIdToken();

    // Llamada al endpoint del backend para obtener el perfil del usuario autenticado
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Error al obtener perfil: ${response.statusText}`);
    }
    const userProfile = await response.json();

    return credentials;

  } catch (error) {
    console.log(error);
    let message;
    if (error.code === "auth/user-not-found") {
      message = "Correo no registrado";
    } else if (error.code === "auth/invalid-credential") {
      message = "Correo o contraseña incorrectos";
    } else if (error.code === "auth/wrong-password") {
      message = "Contraseña incorrecta";
    } else if (error.code) {
      message = "Error al inciar seción";
    }
    // Podrías lanzar el error o retornar el mensaje si lo necesitas
  }
};

export async function logout() {
  await signOut(auth);
}
