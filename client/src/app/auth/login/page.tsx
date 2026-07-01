'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (localStorage.getItem('auth_token')) {
            router.push('/');
        }

        // Handle OAuth errors from URL
        const params = new URLSearchParams(window.location.search);
        const urlError = params.get('error');
        if (urlError) {
            setError(decodeURIComponent(urlError));
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json().catch(() => ({ msg: 'Invalid server response' }));

            if (response.ok) {
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_data', JSON.stringify(data.user));
                // Redirect based on role
                if (data.user && data.user.role === 'admin') {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/';
                }
            } else {
                setError(data.msg || 'Login failed');
            }
        } catch (err: any) {
            console.error('Fetch error:', err);
            setError(err.message === 'Failed to fetch' ? 'Connection to server failed (Is backend running?)' : `Error: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOAuthLogin = (provider: string) => {
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/${provider}?mode=login`;
    };

    return (
        <div className="auth-page">
            <div className="auth-card glass">
                <h1 className="auth-title">Welcome Back</h1>
                <p className="auth-subtitle">Login to access ASTU Helper</p>

                {error && !error.includes('Password') && !error.includes('Credentials') && <div className="auth-error-banner">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            style={(error.includes('Password') || error.includes('Credentials')) ? { borderColor: '#ff4d4d' } : {}}
                        />
                        {(error.includes('Password') || error.includes('Credentials')) && (
                            <span className="input-error">{error}</span>
                        )}
                    </div>

                    <button type="submit" className="btn btn-primary full-width" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="divider" style={{ textAlign: 'center', margin: '1rem 0', opacity: 0.7 }}>OR</div>

                <div className="oauth-buttons">
                    <button
                        type="button"
                        className="btn-google"
                        onClick={() => handleOAuthLogin('google')}
                    >
                        <svg viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Login with Google
                    </button>
                </div>

                <p className="auth-footer">
                    Don&apos;t have an account? <Link href="/auth/signup" className="link">Sign up</Link>
                </p>
            </div>
        </div>
    );
}
