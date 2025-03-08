'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface CustomUser extends Omit<FirebaseUser, 'admin'> {
  admin?: boolean;
}

interface AuthContextType {
  currentUser: CustomUser | null;
  credits: number;
  loading: boolean;
  googleSignIn: () => Promise<void>;
  signinWithEmail: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateCredits: (newCredits: number) => Promise<void>;
  checkCredits: () => Promise<boolean>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthContextProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CustomUser | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const createUserDocument = async (user: FirebaseUser, isAdmin: boolean = false) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        photoURL: user.photoURL || null,
        displayName: user.displayName || null,
        credits: 0,
        admin: isAdmin,
        createdAt: new Date()
      });
    }

    const updatedSnap = await getDoc(userRef);
    return updatedSnap.data();
  };

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await createUserDocument(result.user);
    } catch (error) {
      console.error('Erro no login com Google:', error);
    }
  };

  const signinWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userData = await getDoc(doc(db, 'users', result.user.uid));
      if (!userData.exists()) {
        await createUserDocument(result.user);
      }
    } catch (error) {
      console.error('Erro no login com email:', error);
      throw error;
    }
  };

  const signupWithEmail = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await createUserDocument(result.user);
    } catch (error) {
      console.error('Erro no cadastro:', error);
      throw error;
    }
  };

  const logout = () => signOut(auth);

  const checkCredits = async () => {
    if (!currentUser) return false;
    
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists() && userSnap.data().credits > 0) {
      return true;
    }
    return false;
  };

  const updateCredits = async (newCredits: number) => {
    if (!currentUser) return;
    
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      credits: newCredits
    });
    setCredits(newCredits);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const customUser: CustomUser = {
            ...user,
            admin: userData.admin || false
          };
          setCurrentUser(customUser);
          setCredits(userData.credits || 0);
          setIsAdmin(userData.admin || false);
        } else {
          const newUserData = await createUserDocument(user);
          const customUser: CustomUser = {
            ...user,
            admin: false
          };
          setCurrentUser(customUser);
          setCredits(newUserData?.credits || 0);
          setIsAdmin(false);
        }
      } else {
        setCurrentUser(null);
        setCredits(0);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const value = {
    currentUser,
    credits,
    loading,
    googleSignIn,
    signinWithEmail,
    signupWithEmail,
    logout,
    checkCredits,
    updateCredits,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const UserAuth = () => {
  return useContext(AuthContext);
}; 