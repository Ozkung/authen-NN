"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Input,
  Button,
  Link,
  TextField,
} from "@heroui/react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    const res = await fetch("http://localhost:3001/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setIsLoading(false);
    setMessage(data.message || "Something went wrong");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="flex flex-col items-center gap-1 py-6">
          <h1 className="text-2xl font-bold">Forgot Password</h1>
          <p className="text-small text-default-500 text-center px-4">
            Enter your email to receive a password reset link.
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
            <Button type="submit" isPending={isLoading} className="mt-2 w-full">
              Send Reset Link
            </Button>
          </form>
          {message && (
            <p className="mt-4 text-center text-small text-primary">
              {message}
            </p>
          )}
          <p className="mt-6 text-center text-small">
            Remember your password? <Link href="/login">Login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
