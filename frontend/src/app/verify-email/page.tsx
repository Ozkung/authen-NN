'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('Verifying...');
  const router = useRouter();

  useEffect(() => {
    if (token) {
      fetch(`http://localhost:3001/auth/verify?token=${token}`)
        .then((res) => res.json())
        .then((data) => {
          setStatus(data.message || 'Verification failed');
          if (data.message === 'Email verified successfully') {
            setTimeout(() => router.push('/login'), 2000);
          }
        });
    }
  }, [token, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-2xl font-bold">{status}</h1>
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
