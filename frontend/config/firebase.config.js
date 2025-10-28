  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js"
  import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js"
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyALBIgChHuf4eX-EntxRu9pe5Y-K4M5q4A",
    authDomain: "cardenasvision-9f67c.firebaseapp.com",
    projectId: "cardenasvision-9f67c",
    storageBucket: "cardenasvision-9f67c.firebasestorage.app",
    messagingSenderId: "248218588795",
    appId: "1:248218588795:web:2b85b30a7a5d788d7cf4de"
  };
  
  // Initialize Firebase
  export const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app)