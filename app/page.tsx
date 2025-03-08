'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserAuth } from "./context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { currentUser } = UserAuth();

  useEffect(() => {
    if (currentUser) {
      router.push("/home");
    } else {
      router.push("/login");
    }
  }, [currentUser, router]);

  return null;
}
