// firebase.config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyALBIgChHuf4eX-EntxRu9pe5Y-K4M5q4A",
  authDomain: "cardenasvision-9f67c.firebaseapp.com",
  projectId: "cardenasvision-9f67c",
  storageBucket: "cardenasvision-9f67c.firebasestorage.app",
  messagingSenderId: "248218588795",
  appId: "1:248218588795:web:2b85b30a7a5d788d7cf4de",
};

// ✅ Inicializa Firebase correctamente
const app = initializeApp(firebaseConfig);

// ✅ Pasa la app a getAuth
export const auth = getAuth(app);

export default app;
