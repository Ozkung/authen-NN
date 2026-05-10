'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import MaxCard from '../components/MaxCard';
import { API } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token found in this link.');
      return;
    }

    fetch(`${API}/auth/verify?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.message === 'Email verified successfully') {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMsg(
            data.message || 'Verification failed. The link may have expired.'
          );
        }
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('Could not reach the server. Please try again later.');
      });
  }, [token]);

  useEffect(() => {
    if (status !== 'success') return;
    if (countdown === 0) { router.push('/login'); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown, router]);

  const icon =
    status === 'loading' ? '⧗' :
    status === 'success' ? '◈' : '◇';

  const title =
    status === 'loading' ? 'Verifying…' :
    status === 'success' ? 'All Confirmed' : 'Verification Failed';

  const subtitle =
    status === 'loading' ? 'Please hold on' :
    status === 'success' ? 'Your account is now active' : 'Something went wrong';

  return (
    <MaxCard title={title} subtitle={subtitle}>
      <div className="max-status-body">
        <div
          className="max-status-icon"
          style={{
            color:
              status === 'success' ? '#C9A84C' :
              status === 'error'   ? '#E07878' : '#6A5E7A',
          }}
        >
          {icon}
        </div>

        {status === 'loading' && (
          <p className="max-status-sub">
            We are confirming your email address.<br />
            This will only take a moment.
          </p>
        )}

        {status === 'success' && (
          <>
            <p className="max-status-lead">
              Thank you for registering on this website.
            </p>
            <p className="max-status-sub">
              Your email has been confirmed and your account is ready.<br />
              You may now sign in and begin your journey.
            </p>
            <p className="max-countdown">
              Redirecting in{' '}
              <span className="max-countdown-num">{countdown}</span>
              {countdown === 1 ? ' second' : ' seconds'}
            </p>
            <button
              className="max-btn"
              onClick={() => router.push('/login')}
            >
              Go to Login Now
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="max-status-sub">{errorMsg}</p>
            <a href="/login" className="max-link">Back to Login</a>
          </>
        )}
      </div>
    </MaxCard>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense
      fallback={
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#080412',
          color: '#C9A84C',
          fontFamily: 'var(--font-ui)',
          fontSize: '0.65rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}>
          Loading…
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
