"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Card,
  CardHeader,
  CardContent,
  Input,
  Button,
  Link,
  TextField,
} from "@heroui/react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid credentials");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="flex flex-col items-center gap-1 py-6">
          <h1 className="text-2xl font-bold">Login</h1>
          <p className="text-small text-default-500">
            Welcome back! Please login to continue.
          </p>
        </CardHeader>
        <CardContent className="py-6 px-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField onChange={setEmail} isRequired>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
              />
            </TextField>
            <TextField onChange={setPassword} isRequired>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
              />
            </TextField>
            <div className="flex justify-end">
              <Link href="/forgot-password">Forgot Password?</Link>
            </div>
            <Button
              type="submit"
              variant="primary"
              isPending={isLoading}
              className="mt-2 w-full"
            >
              Login
            </Button>
          </form>
          {error && (
            <p className="mt-4 text-center text-small text-danger">{error}</p>
          )}
          <p className="mt-6 text-center text-small">
            Don't have an account? <Link href="/register">Register</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
