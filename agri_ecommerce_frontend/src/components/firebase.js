// C:\agri\agri_ecommerce_frontend\src\components\firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // If you plan to use Firestore
// import { getStorage } from "firebase/storage"; // If you plan to use Firebase Storage

// Your web app's Firebase configuration
// Replace with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyA159ihojOEBsIxJBuF0rzG3x6gjiE6XF8",
  authDomain: "apas-agri-horty.firebaseapp.com",
  projectId: "apas-agri-horty",
  storageBucket: "apas-agri-horty.firebasestorage.app",
  messagingSenderId: "991351164260",
  appId: "1:991351164260:web:ecc0b51d42698cf5adbe71",
  measurementId: "G-2JT0GSEHHM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app); // If using Firestore
// const storage = getStorage(app); // If using Storage

export { app, auth, db }; // Export the services you need

