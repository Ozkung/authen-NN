"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardContent,
  Input,
  Button,
  TextField,
} from "@heroui/react";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    const res = await fetch("http://localhost:3001/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setIsLoading(false);
    setMessage(data.message || data.error || "Something went wrong");
    if (data.message === "Password reset successfully. You can now login.") {
      setTimeout(() => router.push("/login"), 2000);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-2">
        <h1 className="text-2xl font-bold text-danger">
          Invalid or missing token
        </h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="flex flex-col items-center gap-1 py-6">
          <h1 className="text-2xl font-bold">Reset Password</h1>
          <p className="text-small text-default-500">
            Enter your new password below.
          </p>
        </CardHeader>
        <CardContent className="py-6 px-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <TextField onChange={setPassword} isRequired>
              <Input
                type="password"
                placeholder="Enter your new password"
                value={password}
              />
            </TextField>
            <Button type="submit" isPending={isLoading} className="mt-2">
              Reset Password
            </Button>
          </form>
          {message && (
            <p
              className={`mt-4 text-center text-small ${message.includes("successfully") ? "text-primary" : "text-danger"}`}
            >
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
