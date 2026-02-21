'use client';

import Navbar from "@/components/Navbar";
import AuthGuard from "@/components/AuthGuard";
import { useState, useEffect } from 'react';

type Document = {
    _id: string;
    filename: string;
    contentType: 'pdf' | 'url' | 'txt';
    size?: number;
    status: 'indexed' | 'processing' | 'failed';
    uploadDate: string;
};

export default function AdminPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyAdmin = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                window.location.href = '/auth/login';
                return;
            }

            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/user`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setUser(data);
                    // Proactive redirection for non-admins removed to show persistent denied view
                    if (data.role !== 'admin') {
                        // Stay on page to render custom UI
                    }
                } else {
                    // Token invalid or expired
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_data');
                    window.location.href = '/auth/login';
                }
            } catch (err) {
                console.error('Verification error', err);
                window.location.href = '/auth/login';
            } finally {
                setLoading(false);
            }
        };

        verifyAdmin();
    }, []);

    const [documents, setDocuments] = useState<Document[]>([]);

    const fetchDocuments = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setDocuments(data);
            }
        } catch (err) {
            console.error('Failed to fetch documents', err);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            if (response.ok) {
                setDocuments(prev => prev.filter(d => d._id !== id));
            }
        } catch (err) {
            console.error('Failed to delete', err);
        }
    };
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [uploadMode, setUploadMode] = useState<'file' | 'url' | 'text'>('file');
    const [urlInput, setUrlInput] = useState('');
    const [textInput, setTextInput] = useState('');
    const [textTitle, setTextTitle] = useState('');

    const simulatePipeline = (newDocId: string, type: 'file' | 'url' | 'text') => {
        // Function simplified as we now rely on real backend status
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploading(true);
            setUploadProgress('Uploading PDF...');

            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                    },
                    body: formData
                });

                if (response.ok) {
                    setUploadProgress('file message uploaded successfully ');
                    fetchDocuments();
                    setIsUploading(false);
                } else {
                    const data = await response.json();
                    setUploadProgress('Error: ' + (data.msg || 'Upload failed'));
                    setTimeout(() => setIsUploading(false), 2000);
                }
            } catch (err) {
                setUploadProgress('Network error');
                setTimeout(() => setIsUploading(false), 2000);
            }
        }
    };

    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!urlInput.trim()) return;

        setIsUploading(true);
        setUploadProgress('Indexing URL...');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/url`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({ url: urlInput })
            });

            if (response.ok) {
                setUploadProgress('file message uploaded successfully ');
                setUrlInput('');
                fetchDocuments();
                setIsUploading(false);
            } else {
                setUploadProgress('Error indexing URL');
                setTimeout(() => setIsUploading(false), 2000);
            }
        } catch (err) {
            setUploadProgress('Network error');
            setTimeout(() => setIsUploading(false), 2000);
        }
    };

    const handleTextSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!textInput.trim() || !textTitle.trim()) return;

        setIsUploading(true);
        setUploadProgress('Processing Text...');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({ title: textTitle, content: textInput })
            });

            if (response.ok) {
                setUploadProgress('file message uploaded successfully ');
                setTextInput('');
                setTextTitle('');
                fetchDocuments();
                setIsUploading(false);
            } else {
                setUploadProgress('Error processing text');
                setTimeout(() => setIsUploading(false), 2000);
            }
        } catch (err) {
            setUploadProgress('Network error');
            setTimeout(() => setIsUploading(false), 2000);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'indexed': return 'status-success';
            case 'processing': return 'status-info';
            case 'failed': return 'status-error';
            default: return '';
        }
    };

    const getIcon = (doc: any) => {
        if (doc.contentType === 'url') return '🌐';
        if (doc.contentType === 'txt') return '📝';
        const name = doc.filename || doc.name || '';
        if (name.toLowerCase().endsWith('.pdf')) return '📕';
        return '📄';
    };

    if (loading) return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            gap: '1rem',
            color: 'white'
        }}>
            <div className="admin-icon spin" style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>⚙️</div>
            <p style={{ opacity: 0.8, fontSize: '1.1rem' }}>Verifying admin status...</p>
        </div>
    );

    if (!user || user.role !== 'admin') {
        return (
            <div className="unauthorized-container" style={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'transparent'
            }}>
                <Navbar />
                <div className="container" style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div className="auth-card glass" style={{ textAlign: 'center', maxWidth: '500px' }}>
                        <div className="admin-icon" style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
                        <h1 className="auth-title">Access Denied</h1>
                        <p className="auth-subtitle" style={{ marginBottom: '2rem' }}>
                            You are not allowed to visit the admin page. This area is restricted to administrators only.
                        </p>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="btn btn-primary full-width"
                        >
                            Return to Landing Page
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <AuthGuard>
            <div className="admin-page">
                <Navbar />

                <main className="container main-content">
                    <div className="header">
                        <div className="header-text">
                            <h1 className="title">Knowledge Base Management</h1>
                            <p className="subtitle">Manage documents, text, and website content for the RAG chatbot</p>
                        </div>
                        <div className="stats-summary glass">
                            <div className="stat">
                                <span className="stat-val">{documents.filter(d => d.status === 'indexed').length}</span>
                                <span className="stat-label">Indexed</span>
                            </div>
                            <div className="stat">
                                <span className="stat-val">{documents.length}</span>
                                <span className="stat-label">Total Documents</span>
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-grid">
                        <div className="dashboard-card glass">
                            <h2>Add to Knowledge Base.</h2>
                            <div className="upload-tabs">
                                <button
                                    className={`tab-btn ${uploadMode === 'file' ? 'active' : ''}`}
                                    onClick={() => setUploadMode('file')}
                                >
                                    PDF File
                                </button>
                                <button
                                    className={`tab-btn ${uploadMode === 'url' ? 'active' : ''}`}
                                    onClick={() => setUploadMode('url')}
                                >
                                    Website URL
                                </button>
                                <button
                                    className={`tab-btn ${uploadMode === 'text' ? 'active' : ''}`}
                                    onClick={() => setUploadMode('text')}
                                >
                                    Text Content
                                </button>
                            </div>

                            {uploadMode === 'file' && (
                                <div className="upload-container">
                                    <label className="upload-area">
                                        <input
                                            type="file"
                                            hidden
                                            accept=".pdf,.txt"
                                            onChange={handleFileUpload}
                                            disabled={isUploading}
                                        />
                                        <div className="upload-info">
                                            <span className="admin-icon">{isUploading ? '⚙️' : '📁'}</span>
                                            <p>{isUploading ? uploadProgress : 'Click to upload PDF'}</p>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {uploadMode === 'url' && (
                                <form onSubmit={handleUrlSubmit} className="url-form">
                                    <div className="url-input-group">
                                        <input
                                            type="url"
                                            placeholder="https://example.com"
                                            value={urlInput}
                                            onChange={(e) => setUrlInput(e.target.value)}
                                            required
                                        />
                                        <button type="submit" className="btn btn-primary" disabled={isUploading}>
                                            {isUploading ? 'Indexing...' : 'Index URL'}
                                        </button>
                                    </div>
                                    {isUploading && uploadProgress.includes('URL') && (
                                        <div className="url-status">
                                            <span className="admin-icon spin">⚙️</span>
                                            <span>{uploadProgress}</span>
                                        </div>
                                    )}
                                </form>
                            )}

                            {uploadMode === 'text' && (
                                <form onSubmit={handleTextSubmit} className="text-form">
                                    <input
                                        type="text"
                                        placeholder="Document Title"
                                        className="title-input"
                                        value={textTitle}
                                        onChange={(e) => setTextTitle(e.target.value)}
                                        required
                                    />
                                    <textarea
                                        placeholder="Paste your content here..."
                                        className="text-area-input"
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        required
                                    ></textarea>
                                    <button type="submit" className="btn btn-primary" disabled={isUploading}>
                                        {isUploading ? 'Processing...' : 'Save Text Content'}
                                    </button>
                                </form>
                            )}
                        </div>

                        <div className="dashboard-card glass">
                            <h2>Indexed Documents</h2>
                            <div className="documents-list">
                                {documents.length === 0 ? (
                                    <p className="hint" style={{ textAlign: 'center', padding: '2rem' }}>No documents in knowledge base yet.</p>
                                ) : (
                                    documents.map((doc: any) => (
                                        <div key={doc._id} className="document-item">
                                            <div className="doc-icon">{getIcon(doc)}</div>
                                            <div className="doc-info">
                                                <div className="doc-name">{doc.filename || doc.name}</div>
                                                <div className="doc-meta">
                                                    {doc.contentType.toUpperCase()} • {new Date(doc.uploadDate).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className={`doc-status ${getStatusColor(doc.status)}`}>
                                                {doc.status}
                                            </div>
                                            <button
                                                className="doc-action"
                                                onClick={() => handleDelete(doc._id)}
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AuthGuard>
    );
}
