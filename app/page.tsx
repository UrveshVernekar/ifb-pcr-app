'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    console.log("Root page useEffect - isAuthenticated in localStorage:", isAuthenticated);
    if (isAuthenticated) {
      console.log("Root page - authenticated! Redirecting to /dashboard");
      router.replace('/dashboard');
    } else {
      console.log("Root page - NOT authenticated! Redirecting to /login");
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" />
    </div>
  );
}

