import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

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
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app); 