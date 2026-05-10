'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { Card, CardHeader, CardContent, Button, Link } from '@heroui/react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    fetch(`http://localhost:3001/auth/verify?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.message === 'Email verified successfully') {
          setStatus('success');
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed. The link may have expired.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Could not reach the server. Please try again later.');
      });
  }, [token]);

  useEffect(() => {
    if (status !== 'success') return;

    if (countdown === 0) {
      router.push('/login');
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, countdown, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-8 bg-gray-50">
      <Card className="w-[450px] shadow-lg">
        <CardHeader className="flex flex-col items-center gap-1 py-6">
          {status === 'loading' && (
            <>
              <div className="text-4xl mb-2">⏳</div>
              <h1 className="text-2xl font-bold">Verifying your email...</h1>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="text-4xl mb-2">✅</div>
              <h1 className="text-2xl font-bold">Email Verified!</h1>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="text-4xl mb-2">❌</div>
              <h1 className="text-2xl font-bold">Verification Failed</h1>
            </>
          )}
        </CardHeader>

        <CardContent className="pb-8 px-8 flex flex-col items-center gap-4 text-center">
          {status === 'loading' && (
            <p className="text-default-500">Please wait while we verify your email.</p>
          )}

          {status === 'success' && (
            <>
              <p className="text-default-700 text-base leading-relaxed">
                Thank you for registering on this website.
              </p>
              <p className="text-default-500 text-small">
                Your email has been confirmed. You can now log in to your account.
              </p>
              <p className="text-default-400 text-small mt-2">
                Redirecting to login in{' '}
                <span className="font-semibold text-primary">{countdown}</span> second
                {countdown !== 1 ? 's' : ''}...
              </p>
              <Button
                variant="primary"
                className="mt-2 w-full"
                onPress={() => router.push('/login')}
              >
                Go to Login now
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="text-danger text-small">{message}</p>
              <Link href="/login" className="mt-2">
                Back to Login
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
