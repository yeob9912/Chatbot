'use client';

import Navbar from "@/components/Navbar";
import AuthGuard from "@/components/AuthGuard";
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL;

type Document = {
    _id: string;
    filename: string;
    contentType: 'pdf' | 'url' | 'txt';
    size?: number;
    status: 'indexed' | 'processing' | 'failed';
    uploadDate: string;
};

type UserRecord = {
    _id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    googleId?: string;
};

type Message = {
    role: 'user' | 'assistant' | 'model';
    text?: string;
    content?: string;
    timestamp: string;
};

type ChatLog = {
    _id: string;
    userId: { _id: string; name: string; email: string } | null;
    messages: Message[];
    updatedAt: string;
};

type Tab = 'documents' | 'users' | 'chats';

function AdminPageInner() {
    const searchParams = useSearchParams();
    const activeTab = (searchParams.get('tab') as Tab) || 'documents';

    const [documents, setDocuments] = useState<Document[]>([]);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [chats, setChats] = useState<ChatLog[]>([]);
    const [expandedChat, setExpandedChat] = useState<string | null>(null);
    const [uploadType, setUploadType] = useState<'pdf' | 'url' | 'txt'>('pdf');
    const [urlInput, setUrlInput] = useState('');
    const [txtInput, setTxtInput] = useState('');
    const [txtFilename, setTxtFilename] = useState('');
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [pendingDelete, setPendingDelete] = useState<{ type: 'doc' | 'user' | 'chat'; id: string; name: string; onConfirm: () => void } | null>(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    const headers = { 'Authorization': `Bearer ${token}` };

    const fetchDocuments = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/documents`, { headers });
            if (res.ok) setDocuments(await res.json());
        } catch { }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/auth/users`, { headers });
            if (res.ok) setUsers(await res.json());
        } catch { }
    }, []);

    const fetchChats = useCallback(async () => {
        try {
            const res = await fetch(`${API}/api/chat/all`, { headers });
            if (res.ok) setChats(await res.json());
        } catch { }
    }, []);

    const handleDeleteUser = async (id: string, name: string) => {
        try {
            const res = await fetch(`${API}/api/auth/users/${id}`, {
                method: 'DELETE', headers
            });
            const data = await res.json();
            setMessage(res.ok ? '✅ User deleted.' : `❌ ${data.msg}`);
            if (res.ok) fetchUsers();
        } catch { setMessage('❌ Failed to delete user.'); }
        setPendingDelete(null);
    };

    const handleChangeRole = async (id: string, currentRole: string, name: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        try {
            const res = await fetch(`${API}/api/auth/users/${id}/role`, {
                method: 'PATCH',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            const data = await res.json();
            setMessage(res.ok ? `✅ "${name}" is now ${newRole}.` : `❌ ${data.msg}`);
            if (res.ok) fetchUsers();
        } catch { setMessage('❌ Failed to change role.'); }
    };

    const handleDeleteChat = async (id: string) => {
        try {
            const res = await fetch(`${API}/api/chat/${id}`, {
                method: 'DELETE', headers
            });
            const data = await res.json();
            setMessage(res.ok ? '✅ Chat log deleted.' : `❌ ${data?.msg || 'Error'}`);
            if (res.ok) fetchChats();
        } catch {
            setMessage('❌ Failed to delete chat log.');
        }
        setPendingDelete(null);
    };


    useEffect(() => {
        fetchDocuments();
        fetchUsers();
        fetchChats();
    }, [fetchDocuments, fetchUsers, fetchChats]);

    // Event listener to automatically refresh dashboard views when notifications trigger updates
    useEffect(() => {
        const handleRefresh = () => {
            fetchDocuments();
            fetchUsers();
            fetchChats();
        };
        window.addEventListener('astu_refresh_data', handleRefresh);
        return () => window.removeEventListener('astu_refresh_data', handleRefresh);
    }, [fetchDocuments, fetchUsers, fetchChats]);

    const handleFileUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);
        setMessage('');
        try {
            const form = e.target as HTMLFormElement;
            const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
            if (!fileInput?.files?.[0]) { setMessage('Please select a file.'); setUploading(false); return; }
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            const res = await fetch(`${API}/api/documents/upload`, {
                method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
            });
            const data = await res.json();
            setMessage(res.ok ? '✅ Document uploaded and indexed!' : `❌ ${data.msg}`);
            if (res.ok) { fetchDocuments(); form.reset(); }
        } catch { setMessage('❌ Upload failed.'); }
        setUploading(false);
    };

    const handleUrlUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true); setMessage('');
        try {
            const res = await fetch(`${API}/api/documents/upload-url`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: urlInput })
            });
            const data = await res.json();
            setMessage(res.ok ? '✅ URL indexed successfully!' : `❌ ${data.msg}`);
            if (res.ok) { setUrlInput(''); fetchDocuments(); }
        } catch { setMessage('❌ URL upload failed.'); }
        setUploading(false);
    };

    const handleTxtUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true); setMessage('');
        try {
            const res = await fetch(`${API}/api/documents/upload-text`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: txtInput, filename: txtFilename || 'untitled.txt' })
            });
            const data = await res.json();
            setMessage(res.ok ? '✅ Text indexed successfully!' : `❌ ${data.msg}`);
            if (res.ok) { setTxtInput(''); setTxtFilename(''); fetchDocuments(); }
        } catch { setMessage('❌ Text upload failed.'); }
        setUploading(false);
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`${API}/api/documents/${id}`, {
                method: 'DELETE', headers
            });
            if (res.ok) { setMessage('✅ Document deleted.'); fetchDocuments(); }
        } catch { setMessage('❌ Delete failed.'); }
        setPendingDelete(null);
    };

    return (
        <AuthGuard requiredRole="admin">
            <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'white' }}>
                <Navbar />


                {/* ── DELETE CONFIRMATION OVERLAY ── */}
                {pendingDelete && (
                    <div
                        onClick={() => setPendingDelete(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: 'rgba(0,0,0,0.65)',
                            backdropFilter: 'blur(6px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'rgba(20,20,32,0.98)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                borderRadius: '16px',
                                padding: '2rem 2.5rem',
                                maxWidth: '400px', width: '90%',
                                boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem',
                                textAlign: 'center',
                            }}
                        >
                            <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>🗑</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'white', marginBottom: '0.4rem' }}>
                                    Sure you want to delete?
                                </div>
                                <div style={{
                                    fontSize: '0.9rem', color: '#f87171',
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                    borderRadius: '8px', padding: '0.4rem 1rem', display: 'inline-block',
                                    maxWidth: '100%', wordBreak: 'break-word',
                                }}>
                                    {pendingDelete.name}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
                                <button
                                    onClick={() => { pendingDelete.onConfirm(); setPendingDelete(null); }}
                                    style={{
                                        flex: 1, padding: '0.65rem', borderRadius: '10px',
                                        background: 'linear-gradient(135deg, rgba(239,68,68,0.85), rgba(220,38,38,0.9))',
                                        border: '1px solid rgba(239,68,68,0.5)', color: 'white',
                                        fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                                        boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
                                    }}
                                >
                                    Yes, Delete
                                </button>
                                <button
                                    onClick={() => setPendingDelete(null)}
                                    style={{
                                        flex: 1, padding: '0.65rem', borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)',
                                        fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer',
                                    }}
                                >
                                    No, Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '6rem 1.5rem 2rem' }}>
                    {/* Header */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                            🛡️ Admin Dashboard
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                            Manage knowledge base, registered users, and all chat activity.
                        </p>
                    </div>

                    {message && (
                        <div style={{ padding: '0.75rem 1rem', background: message.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${message.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                            {message}
                        </div>
                    )}

                    {/* ── DOCUMENTS TAB ── */}
                    {activeTab === 'documents' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Upload type selector */}
                            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.5rem' }}>
                                <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Upload New Document</h2>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                    {(['pdf', 'url', 'txt'] as const).map(t => (
                                        <button key={t} onClick={() => setUploadType(t)} style={{ padding: '0.4rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', background: uploadType === t ? 'var(--primary)' : 'rgba(255,255,255,0.07)', color: uploadType === t ? 'white' : 'rgba(255,255,255,0.6)' }}>
                                            {t === 'pdf' ? '📄 PDF' : t === 'url' ? '🌐 URL' : '📝 Text'}
                                        </button>
                                    ))}
                                </div>

                                {uploadType === 'pdf' && (
                                    <form onSubmit={handleFileUpload} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <input type="file" accept=".pdf,.txt" style={{ flex: 1, minWidth: '200px', padding: '0.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }} />
                                        <button type="submit" disabled={uploading} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>{uploading ? 'Uploading...' : 'Upload & Index'}</button>
                                    </form>
                                )}
                                {uploadType === 'url' && (
                                    <form onSubmit={handleUrlUpload} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://example.com/article" style={{ flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }} />
                                        <button type="submit" disabled={uploading} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>{uploading ? 'Indexing...' : 'Index URL'}</button>
                                    </form>
                                )}
                                {uploadType === 'txt' && (
                                    <form onSubmit={handleTxtUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <input value={txtFilename} onChange={e => setTxtFilename(e.target.value)} placeholder="filename (e.g. about-yehwala.txt)" style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white' }} />
                                        <textarea value={txtInput} onChange={e => setTxtInput(e.target.value)} rows={5} placeholder="Paste raw text here..." style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', resize: 'vertical' }} />
                                        <button type="submit" disabled={uploading} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>{uploading ? 'Indexing...' : 'Index Text'}</button>
                                    </form>
                                )}
                            </div>

                            {/* Documents list */}
                            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600, fontSize: '0.95rem' }}>Document Library ({documents.length})</div>
                                {documents.length === 0 ? (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No documents indexed yet.</div>
                                ) : documents.map(doc => (
                                    <div key={doc._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div>
                                            <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{doc.filename}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                                                {doc.contentType.toUpperCase()} · {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : 'N/A'} · {new Date(doc.uploadDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: '99px', background: doc.status === 'indexed' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: doc.status === 'indexed' ? '#4ade80' : '#f87171' }}>{doc.status}</span>
                                            <button
                                                onClick={() => setPendingDelete({ type: 'doc', id: doc._id, name: doc.filename || doc._id, onConfirm: () => handleDelete(doc._id) })}
                                                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                                            >🗑 Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── USERS TAB ── */}
                    {activeTab === 'users' && (
                        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600, fontSize: '0.95rem' }}>User Directory ({users.length})</div>
                            {users.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>No users registered yet.</div>
                            ) : users.map((u, i) => (
                                <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1.5rem', borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', flexWrap: 'wrap' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                                        {u.name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{u.name}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>{u.email}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {u.googleId && <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '99px', background: 'rgba(66,133,244,0.15)', color: '#60a5fa' }}>Google</span>}
                                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '99px', background: u.role === 'admin' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)', color: u.role === 'admin' ? '#f87171' : 'rgba(255,255,255,0.6)' }}>{u.role}</span>
                                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>Joined {new Date(u.createdAt).toLocaleDateString()}</span>
                                        {/* Role toggle button */}
                                        <button
                                            onClick={() => handleChangeRole(u._id, u.role, u.name)}
                                            title={`Make ${u.role === 'admin' ? 'user' : 'admin'}`}
                                            style={{ padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                                            {u.role === 'admin' ? '↓ Make User' : '↑ Make Admin'}
                                        </button>
                                        <button
                                            onClick={() => setPendingDelete({ type: 'user', id: u._id, name: u.name || u.email, onConfirm: () => handleDeleteUser(u._id, u.name) })}
                                            style={{ padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#f87171', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                                        >🗑 Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── CHAT LOGS TAB ── */}
                    {activeTab === 'chats' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.25rem' }}>Recorded chats ({chats.length})</div>
                            {chats.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', borderRadius: '12px' }}>No chat activity yet.</div>
                            ) : chats.map(chat => (
                                <div key={chat._id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                                    {/* Chat summary header */}
                                    <div style={{ display: 'flex', alignItems: 'center', paddingRight: '1rem', borderBottom: expandedChat === chat._id ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                                        <button onClick={() => setExpandedChat(expandedChat === chat._id ? null : chat._id)}
                                            style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', textAlign: 'left' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                                                    {chat.userId?.name?.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || '?'}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'white' }}>{chat.userId?.name || 'Deleted User'}</div>
                                                    <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.4)' }}>{chat.userId?.email || ''}</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{chat.messages.length} msg{chat.messages.length !== 1 ? 's' : ''}</span>
                                                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{new Date(chat.updatedAt).toLocaleString()}</span>
                                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{expandedChat === chat._id ? '▲' : '▼'}</span>
                                            </div>
                                        </button>
                                        
                                        <button
                                            onClick={() => setPendingDelete({ type: 'chat', id: chat._id, name: `${chat.userId?.name || 'Unknown'}'s conversation (${chat.messages.length} messages)`, onConfirm: () => handleDeleteChat(chat._id) })}
                                            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0 }}
                                        >🗑 Delete Log</button>
                                    </div>

                                    {/* Expanded messages */}
                                    {expandedChat === chat._id && (
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {chat.messages.map((msg, idx) => (
                                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>
                                                        {msg.role === 'user' ? '👤 User Question' : '🤖 Assistant Response'} · {new Date(msg.timestamp).toLocaleTimeString()}
                                                    </span>
                                                    <div style={{
                                                        maxWidth: '85%', padding: '0.7rem 1rem', borderRadius: '12px', fontSize: '0.88rem', lineHeight: '1.6',
                                                        background: msg.role === 'user' ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.05)',
                                                        border: msg.role === 'user' ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.07)',
                                                        color: 'rgba(255,255,255,0.9)'
                                                    }}>
                                                        {msg.text || msg.content}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthGuard>
    );
}

export default function AdminPage() {
    return (
        <Suspense fallback={
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'white' }}>
                Loading...
            </div>
        }>
            <AdminPageInner />
        </Suspense>
    );
}
