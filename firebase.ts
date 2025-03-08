import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVvRbW-PdHmz_8Oc3LMhteCaD98i-VaaA",
  authDomain: "redacione-c7f44.firebaseapp.com",
  projectId: "redacione-c7f44",
  storageBucket: "redacione-c7f44.firebasestorage.app",
  messagingSenderId: "198758717483",
  appId: "1:198758717483:web:280dac6d80bfa8da8fb26e",
  measurementId: "G-GFWVLF74HD"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);