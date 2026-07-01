'use client';

import Link from 'next/link';
import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

function NavbarInner() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [avatar, setAvatar] = useState<string>('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [userCount, setUserCount] = useState<number>(0);
    const [chatCount, setChatCount] = useState<number>(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'documents';

    // Notification states
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [toasts, setToasts] = useState<{ id: string; message: string; type: string }[]>([]);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        setIsAuthenticated(!!token);
        const userData = localStorage.getItem('user_data');
        if (userData) setUser(JSON.parse(userData));
    }, []);

    // Load avatar only after user is known — keyed by user ID so each account has its own photo
    useEffect(() => {
        const userId = user?.id || user?._id;
        if (!userId) return;
        const savedAvatar = localStorage.getItem(`user_avatar_${userId}`);
        setAvatar(savedAvatar || '');
    }, [user]);

    // Fetch counts for admin nav badges
    useEffect(() => {
        if (!user || user.role !== 'admin') return;
        const token = localStorage.getItem('auth_token');
        const h = { 'Authorization': `Bearer ${token}` };
        fetch(`${API}/api/auth/users`, { headers: h })
            .then(r => r.json()).then(d => Array.isArray(d) && setUserCount(d.length)).catch(() => {});
        fetch(`${API}/api/chat/all`, { headers: h })
            .then(r => r.json()).then(d => Array.isArray(d) && setChatCount(d.length)).catch(() => {});
    }, [user]);

    // Fetch notifications callback
    const fetchNotifications = useCallback(async () => {
        if (!user || user.role !== 'admin') return;
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        try {
            const res = await fetch(`${API}/api/auth/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();

                // Compare with previous state to detect new unread notifications and pop toasts
                setNotifications(prev => {
                    const prevMap = new Map(prev.map(n => [n._id, n]));

                    data.forEach((notif: any) => {
                        const existing = prevMap.get(notif._id);
                        // If it's a new notification and is unread, pop a toast
                        if (!existing && !notif.read) {
                            const toastId = notif._id || Date.now().toString() + Math.random();
                            setToasts(t => {
                                if (t.some(x => x.id === toastId)) return t;
                                return [...t, { id: toastId, message: notif.message, type: notif.type }];
                            });
                            setTimeout(() => {
                                setToasts(t => t.filter(x => x.id !== toastId));
                            }, 5000);
                        }
                    });

                    return data;
                });
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    }, [user]);

    // Poll notifications
    useEffect(() => {
        if (!user || user.role !== 'admin') return;
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 5000);
        return () => clearInterval(interval);
    }, [user, fetchNotifications]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
                setDropdownOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node))
                setNotifOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        setIsAuthenticated(false);
        setDropdownOpen(false);
        router.push('/auth/login');
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const userId = user?.id || user?._id;
        if (!userId || !e.target.files?.[0]) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const b64 = reader.result as string;
            setAvatar(b64);
            localStorage.setItem(`user_avatar_${userId}`, b64);
        };
        reader.readAsDataURL(e.target.files[0]);
    };

    const handleAvatarRemove = () => {
        const userId = user?.id || user?._id;
        if (!userId) return;
        localStorage.removeItem(`user_avatar_${userId}`);
        setAvatar('');
    };

    // Mark single notification as read and view it
    const handleMarkRead = async (notifId: string, type: string) => {
        const token = localStorage.getItem('auth_token');
        try {
            await fetch(`${API}/api/auth/notifications/${notifId}/read`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Update local state
            setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, read: true } : n));

            // Notify admin dashboard to refresh lists
            window.dispatchEvent(new Event('astu_refresh_data'));

            // Navigate to appropriate tab
            if (type === 'signup') {
                router.push('/admin?tab=users');
            } else if (type === 'chat') {
                router.push('/admin?tab=chats');
            }
            setNotifOpen(false);
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    // Mark all as read
    const handleMarkAllRead = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            await fetch(`${API}/api/auth/notifications/read`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            window.dispatchEvent(new Event('astu_refresh_data'));
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const getInitials = () =>
        user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'U';

    const isAdmin = user?.role === 'admin';
    const isAdminPage = pathname === '/admin';

    const unreadCount = notifications.filter(n => !n.read).length;

    const adminTabs = [
        { key: 'documents', emoji: '📄', label: 'Document Management', count: null },
        { key: 'users',     emoji: '👥', label: 'User Management',     count: userCount },
        { key: 'chats',     emoji: '💬', label: 'Chat Management',     count: chatCount },
    ];

    // Shared active/inactive styles for desktop top nav links
    const desktopLinkStyle = (key: string): React.CSSProperties => ({
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '0.45rem 1.1rem', borderRadius: '10px',
        fontSize: '0.84rem', fontWeight: 600, textDecoration: 'none',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        background: activeTab === key
            ? 'linear-gradient(135deg, rgba(99,102,241,0.28), rgba(129,140,248,0.18))'
            : 'rgba(255,255,255,0.04)',
        color: activeTab === key ? 'white' : 'rgba(255,255,255,0.55)',
        border: activeTab === key
            ? '1px solid rgba(99,102,241,0.5)'
            : '1px solid rgba(255,255,255,0.06)',
        boxShadow: activeTab === key
            ? '0 0 16px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
            : '0 1px 3px rgba(0,0,0,0.2)',
        transform: activeTab === key ? 'translateY(-1px)' : 'translateY(0)',
        whiteSpace: 'nowrap',
        position: 'relative',
    });

    const desktopBadgeStyle = (key: string): React.CSSProperties => ({
        background: activeTab === key
            ? 'rgba(255,255,255,0.25)'
            : 'rgba(99,102,241,0.4)',
        color: 'white',
        borderRadius: '99px', padding: '1px 7px',
        fontSize: '0.68rem', minWidth: '18px', textAlign: 'center',
        fontWeight: 700,
        boxShadow: activeTab === key ? '0 0 8px rgba(99,102,241,0.5)' : 'none',
    });

    return (
        <>
            {/* ─── TOAST NOTIFICATIONS ─── */}
            <div style={{
                position: 'fixed',
                top: '75px',
                right: '20px',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                pointerEvents: 'none',
                maxWidth: '350px',
                width: '100%'
            }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        style={{
                            background: 'rgba(20, 20, 35, 0.95)',
                            backdropFilter: 'blur(10px)',
                            borderLeft: `4px solid ${toast.type === 'signup' ? '#6366f1' : '#10b981'}`,
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            borderRight: '1px solid rgba(255,255,255,0.08)',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            color: 'white',
                            padding: '1rem',
                            borderRadius: '8px',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                            pointerEvents: 'auto',
                            animation: 'slideIn 0.3s ease-out forwards',
                            fontSize: '0.85rem',
                            fontWeight: 600
                        }}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>

            {/* ─── CSS for responsive layouts ─── */}
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(120%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                /* Desktop tab hover lift + glow effect */
                .admin-top-tab {
                    cursor: pointer;
                }
                .admin-top-tab:hover {
                    background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(129,140,248,0.12)) !important;
                    color: white !important;
                    border-color: rgba(99,102,241,0.35) !important;
                    transform: translateY(-2px) !important;
                    box-shadow: 0 4px 20px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.1) !important;
                }
                .admin-top-tab:active {
                    transform: translateY(0px) scale(0.97) !important;
                    box-shadow: 0 1px 6px rgba(99,102,241,0.2) !important;
                    transition: all 0.1s ease !important;
                }
                /* Active tab pulse animation */
                @keyframes activeTabPulse {
                    0%   { box-shadow: 0 0 12px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.1); }
                    50%  { box-shadow: 0 0 22px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.15); }
                    100% { box-shadow: 0 0 12px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.1); }
                }
                .admin-top-tab-active {
                    animation: activeTabPulse 2.5s ease-in-out infinite;
                }
                /* Active underline sweep animation */
                .admin-top-tab-active::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 15%;
                    right: 15%;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #818cf8, transparent);
                    border-radius: 2px;
                    animation: underlineSweep 2.5s ease-in-out infinite;
                }
                @keyframes underlineSweep {
                    0%   { opacity: 0.4; left: 25%; right: 25%; }
                    50%  { opacity: 1;   left: 10%; right: 10%; }
                    100% { opacity: 0.4; left: 25%; right: 25%; }
                }

                /* Hide desktop admin tabs on mobile and switch nav-container to flex spacing */
                @media (max-width: 768px) {
                    .admin-top-tabs { display: none !important; }
                    .nav-container {
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        width: 100% !important;
                    }
                }

                /* Hide mobile bottom nav on desktop */
                .admin-bottom-nav { display: none; }
                @media (max-width: 768px) {
                    .admin-bottom-nav {
                        display: flex;
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: rgba(15, 15, 23, 0.97);
                        backdrop-filter: blur(18px);
                        -webkit-backdrop-filter: blur(18px);
                        border-top: 1px solid rgba(255, 255, 255, 0.09);
                        padding: 0.45rem 0 0.55rem;
                        justify-content: space-around;
                        align-items: center;
                        z-index: 1000;
                        box-shadow: 0 -6px 28px rgba(0, 0, 0, 0.55);
                    }
                    .admin-bottom-tab {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 3px;
                        flex: 1;
                        padding: 0.35rem 0.25rem;
                        text-decoration: none;
                        transition: all 0.2s;
                        position: relative;
                    }
                    .admin-bottom-tab-emoji {
                        font-size: 1.3rem;
                        line-height: 1;
                        transition: transform 0.2s;
                    }
                    .admin-bottom-tab:active .admin-bottom-tab-emoji {
                        transform: scale(0.85);
                    }
                    .admin-bottom-tab-label {
                        font-size: 0.62rem;
                        font-weight: 600;
                        letter-spacing: 0.01em;
                        text-align: center;
                        line-height: 1.2;
                        color: rgba(255, 255, 255, 0.5);
                    }
                    .admin-bottom-tab.active-tab .admin-bottom-tab-label {
                        color: white;
                    }
                    .admin-bottom-tab.active-tab .admin-bottom-tab-emoji {
                        filter: drop-shadow(0 0 6px rgba(99,102,241,0.9));
                    }
                    .admin-bottom-tab.active-tab::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 20%;
                        right: 20%;
                        height: 2px;
                        background: linear-gradient(90deg, #6366f1, #818cf8);
                        border-radius: 0 0 4px 4px;
                    }
                    .admin-bottom-badge {
                        position: absolute;
                        top: 2px;
                        right: calc(50% - 18px);
                        background: #6366f1;
                        color: white;
                        border-radius: 99px;
                        font-size: 0.6rem;
                        padding: 1px 5px;
                        font-weight: 700;
                        min-width: 16px;
                        text-align: center;
                        line-height: 1.4;
                    }
                }
            `}</style>

            {/* ─── TOP NAVBAR ─── */}
            <nav className="navbar">
                <div className="container nav-container" style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    width: '100%',
                }}>
                    {/* Left: Logo */}
                    <Link href={isAdmin ? '/admin' : '/'} className="logo" style={{ flexShrink: 0, justifySelf: 'start' }}>
                        ASTU Helper
                    </Link>

                    {/* Center: Admin tabs — desktop only */}
                    {isAdmin && isAdminPage ? (
                        <div className="admin-top-tabs" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
                            {adminTabs.map(tab => (
                                <Link
                                    key={tab.key}
                                    href={`/admin?tab=${tab.key}`}
                                    className={`admin-top-tab ${activeTab === tab.key ? 'admin-top-tab-active' : ''}`}
                                    style={desktopLinkStyle(tab.key)}
                                >
                                    {tab.emoji} {tab.label}
                                    {tab.count !== null && (
                                        <span style={desktopBadgeStyle(tab.key)}>{tab.count}</span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    ) : <div />}

                    {/* Right: Profile / auth links */}
                    <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        {isAuthenticated ? (
                            <>
                                {/* Notification Center (Admin only) */}
                                {isAdmin && (
                                    <div ref={notifRef} style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => setNotifOpen(!notifOpen)}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                fontSize: '1.3rem', position: 'relative', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', padding: '6px',
                                                borderRadius: '50%', transition: 'background 0.2s',
                                                color: notifOpen ? 'white' : 'rgba(255,255,255,0.65)'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                        >
                                            🔔
                                            {unreadCount > 0 && (
                                                <span style={{
                                                    position: 'absolute', top: '1px', right: '1px',
                                                    background: '#ef4444', color: 'white', fontSize: '0.62rem',
                                                    borderRadius: '99px', padding: '1px 5px', fontWeight: 800,
                                                    minWidth: '15px', textAlign: 'center', border: '2px solid rgba(20,20,30,0.98)'
                                                }}>
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </button>

                                        {notifOpen && (
                                            <div style={{
                                                position: 'absolute', right: 0, top: '45px', width: '320px',
                                                backgroundColor: 'rgba(20,20,30,0.98)', backdropFilter: 'blur(15px)',
                                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
                                                boxShadow: '0 12px 35px -6px rgba(0,0,0,0.6)', zIndex: 200,
                                                display: 'flex', flexDirection: 'column', overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    padding: '0.85rem 1.1rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white' }}>Notifications</span>
                                                    {unreadCount > 0 && (
                                                        <button
                                                            onClick={handleMarkAllRead}
                                                            style={{
                                                                background: 'none', border: 'none', color: '#6366f1',
                                                                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', padding: 0
                                                            }}
                                                        >
                                                            Mark all read
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                    {notifications.length === 0 ? (
                                                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                                                            No notifications yet
                                                        </div>
                                                    ) : (
                                                        notifications.map(n => (
                                                            <div
                                                                key={n._id}
                                                                onClick={() => handleMarkRead(n._id, n.type)}
                                                                style={{
                                                                    padding: '0.85rem 1.1rem',
                                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                                    cursor: 'pointer',
                                                                    background: n.read ? 'transparent' : 'rgba(239, 68, 68, 0.05)',
                                                                    borderLeft: n.read ? '3px solid transparent' : '3px solid #ef4444',
                                                                    transition: 'background 0.2s',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '3px',
                                                                    textAlign: 'left'
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                                onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(239, 68, 68, 0.05)'}
                                                            >
                                                                <div style={{
                                                                    fontSize: '0.8rem',
                                                                    color: n.read ? 'rgba(255,255,255,0.7)' : 'white',
                                                                    fontWeight: n.read ? 500 : 600,
                                                                    lineHeight: 1.3
                                                                }}>
                                                                    {n.message}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.65rem',
                                                                    color: 'rgba(255,255,255,0.35)'
                                                                }}>
                                                                    {new Date(n.createdAt).toLocaleString()}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* User Dropdown */}
                                <div ref={dropdownRef} style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setDropdownOpen(!dropdownOpen)}
                                        style={{
                                            width: '40px', height: '40px', borderRadius: '50%',
                                            backgroundColor: 'var(--primary)', color: 'white',
                                            border: '2px solid rgba(255,255,255,0.12)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 'bold', fontSize: '0.95rem', overflow: 'hidden', padding: 0,
                                        }}
                                    >
                                        {avatar
                                            ? <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : getInitials()}
                                    </button>

                                    {dropdownOpen && (
                                        <div style={{
                                            position: 'absolute', right: 0, top: '50px', width: '240px',
                                            backgroundColor: 'rgba(20,20,30,0.97)', backdropFilter: 'blur(14px)',
                                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
                                            padding: '1.25rem', display: 'flex', flexDirection: 'column',
                                            gap: '1rem', boxShadow: '0 12px 30px -6px rgba(0,0,0,0.5)',
                                            alignItems: 'center', textAlign: 'center', zIndex: 200,
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                                                <div style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>{user?.name || 'User'}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', wordBreak: 'break-all' }}>{user?.email || ''}</div>
                                                {isAdmin && (
                                                    <span style={{ fontSize: '0.7rem', padding: '2px 10px', borderRadius: '99px', background: 'rgba(239,68,68,0.15)', color: '#f87171', marginTop: '2px' }}>
                                                        Admin
                                                    </span>
                                                )}
                                            </div>
                                            <hr style={{ width: '100%', border: 0, borderTop: '1px solid rgba(255,255,255,0.08)', margin: 0 }} />
                                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                {/* Avatar preview */}
                                                {avatar && (
                                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.25rem' }}>
                                                        <img src={avatar} alt="Your photo" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(99,102,241,0.4)' }} />
                                                    </div>
                                                )}
                                                <label htmlFor="avatar-upload" style={{
                                                    display: 'block', padding: '0.45rem',
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px dashed rgba(255,255,255,0.18)',
                                                    borderRadius: '6px', fontSize: '0.8rem',
                                                    color: 'rgba(255,255,255,0.8)', cursor: 'pointer',
                                                    textAlign: 'center',
                                                }}>
                                                    📷 {avatar ? 'Change Photo' : 'Upload Photo'}
                                                </label>
                                                <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                                                {avatar && (
                                                    <button
                                                        onClick={handleAvatarRemove}
                                                        style={{
                                                            width: '100%', padding: '0.4rem',
                                                            background: 'rgba(239,68,68,0.08)',
                                                            border: '1px solid rgba(239,68,68,0.22)',
                                                            borderRadius: '6px', fontSize: '0.78rem',
                                                            color: '#f87171', cursor: 'pointer',
                                                        }}
                                                    >
                                                        🗑 Remove Photo
                                                    </button>
                                                )}
                                            </div>
                                            <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}>
                                                Logout
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <Link href="/auth/login" className="nav-link">Login</Link>
                                <Link href="/auth/signup" className="btn btn-primary">Get Started</Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* ─── MOBILE BOTTOM NAV (admin only) ─── */}
            {isAdmin && isAdminPage && (
                <div className="admin-bottom-nav">
                    {adminTabs.map(tab => (
                        <Link
                            key={tab.key}
                            href={`/admin?tab=${tab.key}`}
                            className={`admin-bottom-tab ${activeTab === tab.key ? 'active-tab' : ''}`}
                        >
                            {tab.count !== null && tab.count > 0 && (
                                <span className="admin-bottom-badge">{tab.count}</span>
                            )}
                            <span className="admin-bottom-tab-emoji">{tab.emoji}</span>
                            <span className="admin-bottom-tab-label">{tab.label}</span>
                        </Link>
                    ))}
                </div>
            )}
        </>
    );
}

export default function Navbar() {
    return (
        <Suspense fallback={
            <nav className="navbar" style={{ position: 'relative', zIndex: 100 }}>
                <div className="container nav-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="logo">ASTU Helper</span>
                </div>
            </nav>
        }>
            <NavbarInner />
        </Suspense>
    );
}
