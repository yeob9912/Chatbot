'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        setIsAuthenticated(!!token);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setIsAuthenticated(false);
        router.push('/auth/login');
    };

    return (
        <nav className="navbar">
            <div className="container nav-container">
                <Link href="/" className="logo">
                    ASTU Helper
                </Link>
                <div className="nav-links">
                    {isAuthenticated ? (
                        <>
                            <Link href="/admin" className="nav-link">
                                Admin Dashboard
                            </Link>
                            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/auth/login" className="nav-link">
                                Login
                            </Link>
                            <Link href="/auth/signup" className="btn btn-primary">
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
