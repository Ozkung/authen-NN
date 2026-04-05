'use client';

import { RouterProvider } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <SessionProvider>
      <RouterProvider navigate={router.push}>
        {children}
      </RouterProvider>
    </SessionProvider>
  );
}
