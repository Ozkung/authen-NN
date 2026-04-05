"use client";

import { useRouter } from "next/navigation";
import { Button, Card, CardContent } from "@heroui/react";
import { useSession, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
      <h1 className="text-5xl font-extrabold mb-12 text-primary">
        Auth Project
      </h1>

      <Card className="w-[500px] shadow-xl">
        <CardContent className="py-12 px-10 flex flex-col items-center text-center gap-6">
          {session ? (
            <>
              <p className="text-2xl font-semibold">Welcome back!</p>
              <p className="text-default-500 font-medium text-large">
                {session.user?.email}
              </p>
              <p className="text-default-500">
                You have successfully authenticated with our system.
              </p>
              <Button
                variant="danger"
                onPress={handleLogout}
                className="mt-4 px-8"
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold">Authentication System</p>
              <p className="text-default-500 mb-4">
                Please login or register to access the secure features of this
                application.
              </p>
              <div className="flex gap-4 w-full justify-center">
                <Button onClick={() => router.push("/login")} className="px-10">
                  Login
                </Button>
                <Button
                  onClick={() => router.push("/register")}
                  className="px-10"
                >
                  Register
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <footer className="mt-16 text-default-400 text-small">
        Built with Next.js 16, NestJS 11, and HeroUI v3
      </footer>
    </div>
  );
}
