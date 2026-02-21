'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthSuccessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        const userStr = searchParams.get('user');

        if (token && userStr) {
            try {
                localStorage.setItem('auth_token', token);
                // Decode URI component for user string
                localStorage.setItem('user_data', decodeURIComponent(userStr));
                router.push('/');
            } catch (e) {
                console.error("Error parsing user data", e);
                router.push('/auth/login?error=OAuthFailed');
            }
        } else {
            router.push('/auth/login?error=NoToken');
        }
    }, [router, searchParams]);

    return (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <h2>Authenticating...</h2>
        </div>
    );
}

export default function AuthSuccessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AuthSuccessContent />
        </Suspense>
    );
}
