'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthGuard({ children, requiredRole }: { children: React.ReactNode, requiredRole?: 'admin' | 'user' }) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const verifyToken = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                router.push('/auth/login');
                return;
            }

            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const userData = await response.json();
                    const targetRole = requiredRole || 'user';

                    if (userData.role === 'admin' && targetRole !== 'admin') {
                        router.push('/admin');
                        return;
                    }
                    if (targetRole === 'admin' && userData.role !== 'admin') {
                        router.push('/');
                        return;
                    }

                    setAuthorized(true);
                } else {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_data');
                    router.push('/auth/login');
                }
            } catch (err) {
                console.error('Auth verification failed:', err);
                // Fallback to local check if server is down, or force login
                router.push('/auth/login');
            }
        };

        verifyToken();
    }, [router, requiredRole]);

    if (!authorized) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <p style={{ opacity: 0.6 }}>Loading...</p>
            </div>
        );
    }

    return <>{children}</>;
}
