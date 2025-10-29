import { auth } from "../config/firebase.config.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

// URL base del backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4040';

export async function login(email, password) {
  try {
    const credentials = await signInWithEmailAndPassword(auth, email, password);
    
    // Obtener el token del usuario autenticado
    const token = await credentials.user.getIdToken();

    // Llamar al endpoint para obtener el UID
    const response = await fetch(`${API_URL}/api/auth/uid`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener UID del usuario');
    }

    const data = await response.json();
    if (data.success) {
      console.log('UID del usuario:', data.uid);
    }

    return {
      ...credentials,
      uid: data.uid
    };

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
      message = "Error al iniciar sesión";
    }
    throw new Error(message || "Error al iniciar sesión");
  }
};

export async function logout() {
  await signOut(auth);
}
