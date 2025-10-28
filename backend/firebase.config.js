  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js"
  import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js"
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyBx1zaLfph2l9-JylJroqs8kYkmegnxHK0",
    authDomain: "fir-auth-a1d39.firebaseapp.com",
    projectId: "fir-auth-a1d39",
    storageBucket: "fir-auth-a1d39.firebasestorage.app",
    messagingSenderId: "81981986353",
    appId: "1:81981986353:web:c610b6f98ce73e7c2ae710"
  };

  // Initialize Firebase
  export const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app)
  export const db = getFirestore(app)