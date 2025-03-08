import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCOQRVC-j5TkW7K1Ofgxn8K4_zYsWA6Og8",
  authDomain: "dunas-trip-firebase-proj-1548e.firebaseapp.com",
  projectId: "dunas-trip-firebase-proj-1548e",
  storageBucket: "dunas-trip-firebase-proj-1548e.firebasestorage.app",
  messagingSenderId: "1030856580709",
  appId: "1:1030856580709:web:95dd1eaaf4af6b80f3708c",
  measurementId: "G-JC9SB12SMT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);