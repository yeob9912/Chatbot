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
    }, [router]);

    if (!authorized) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--background)',
                gap: '1rem'
            }}>
                <div className="admin-icon spin" style={{ fontSize: '2rem', color: 'var(--primary)' }}>⚙️</div>
                <p style={{ opacity: 0.6 }}>Verifying access...</p>
            </div>
        );
    }

    return <>{children}</>;
}
