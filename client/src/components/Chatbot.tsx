'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
    id: string;
    role: 'user' | 'bot';
    content: string;
};

const greetings = ['hi', 'hello', 'hey', 'greetings', 'hola', 'hi there'];

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [chats, setChats] = useState<any[]>([]);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'bot', content: 'Hello! I am ASTU\'s Helper. How can I assist you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const toggleChat = () => setIsOpen(!isOpen);
    const toggleHistory = () => setShowHistory(!showHistory);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    };

    const formatTime = () => {
        const now = new Date();
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Fetch history when chat opens
    const fetchHistory = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/history`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setChats(data);
                return data;
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        }
        return [];
    };

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen]);

    const loadChat = (chat: any) => {
        const historyMessages: Message[] = chat.messages.map((msg: any) => ({
            id: msg._id || Date.now().toString() + Math.random(),
            role: msg.role === 'model' ? 'bot' : 'user',
            content: msg.text || msg.content
        }));
        setMessages(historyMessages);
        setShowHistory(false);
    };

    const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
        e.stopPropagation(); // Prevent loading the chat when deleting
        if (!confirm('Are you sure you want to delete this chat history?')) return;

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/${chatId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });

            if (response.ok) {
                setChats(prev => prev.filter(chat => chat._id !== chatId));
                // Optional: reset current messages if deleting the currently viewed chat
                // However, the simplest behavior is just removing it from history
            } else {
                alert('Failed to delete chat history');
            }
        } catch (err) {
            console.error('Delete chat error:', err);
            alert('An error occurred while deleting');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;

        const userMsg = input.trim();
        const userMessage: Message = { id: Date.now().toString(), role: 'user', content: userMsg };
        setMessages(prev => [...prev, userMessage]);
        setInput('');

        // REMOVED frontend greeting interception to allow backend streaming to take over
        // if (greetings.includes(userMsg.toLowerCase())) { ... }

        setIsTyping(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({ query: userMsg })
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No reader');

            const decoder = new TextDecoder();
            let botMsgId = Date.now().toString() + 'bot';
            setMessages(prev => [...prev, { id: botMsgId, role: 'bot', content: '' }]);

            let accumulatedContent = "";
            let lineBuffer = ""; // To store partial lines

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                lineBuffer += chunk;

                const lines = lineBuffer.split('\n');
                // The last element might be a partial line, keep it in the buffer
                lineBuffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('data: ')) {
                        const data = trimmedLine.slice(6);
                        if (data === '[DONE]') continue;
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.text) {
                                accumulatedContent += parsed.text;
                                setMessages(prev => prev.map(msg =>
                                    msg.id === botMsgId ? { ...msg, content: accumulatedContent } : msg
                                ));
                            }
                        } catch (e) {
                            console.error("JSON parse error in stream:", e, data);
                        }
                    }
                }
            }

            if (!accumulatedContent) {
                console.warn("Stream ended with no content");
                setMessages(prev => prev.map(msg =>
                    msg.id === botMsgId ? { ...msg, content: 'i have no information about the thing you asked me !' } : msg
                ));
            }

            fetchHistory();
        } catch (err) {
            console.error('Chat request error:', err);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', content: 'i have no information about the thing you asked me !' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const renderMessage = (text: string) => {
        if (!text) return null;
        const lines = text.split('\n');
        const isList = lines.some(line => line.trim().startsWith('- ') || line.trim().startsWith('* ') || /^\d+\./.test(line.trim()));

        if (isList) {
            return (
                <div className="message-content">
                    {lines.map((line, i) => {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                            return <li key={i} style={{ marginLeft: '1rem', marginBottom: '0.4rem' }}>{trimmed.substring(2)}</li>;
                        }
                        return <p key={i} style={{ marginBottom: '0.6rem' }}>{line}</p>;
                    })}
                </div>
            );
        }
        return <p>{text}</p>;
    };

    return (
        <>
            <button
                className={`chat-toggle ${isOpen ? 'open' : ''}`}
                onClick={toggleChat}
                aria-label="Toggle chat"
            >
                {isOpen ? '✕' : '💬'}
            </button>

            <div className={`chat-window ${isOpen ? 'visible' : ''}`}>
                <div className="chat-header">
                    <div className="header-left">
                        <h3>ASTU AI Assistant</h3>
                        <div className="status-indicator">
                            <span className="status-dot online"></span>
                        </div>
                    </div>
                    <div className="header-right">
                        <button className="history-btn" onClick={toggleHistory}>
                            {showHistory ? 'Back to Chat' : 'Show History'}
                        </button>
                        <button className="close-chat" onClick={toggleChat}>✕</button>
                    </div>
                </div>

                <div className="chat-body-container">
                    <div className="main-chat-area">
                        <div className="chat-messages">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`message ${msg.role}`}>
                                    <div className="message-content">
                                        {msg.role === 'bot' ? renderMessage(msg.content) : msg.content}
                                    </div>
                                    <span className="message-time">{formatTime()}</span>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="message bot typing-indicator">
                                    <div className="message-content">
                                        <div className="typing-dots">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input-area">
                            <form onSubmit={handleSubmit}>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask about ASTU..."
                                    className="chat-input"
                                    disabled={isTyping}
                                />
                                <button type="submit" className="send-btn" disabled={!input || isTyping}>
                                    ➤
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* History Sidebar on the Right - No Border */}
                    <div className={`history-sidebar ${showHistory ? 'open' : ''}`}>
                        <h4 style={{ padding: '1rem' }}>Recent Conversions</h4>
                        <div className="history-list">
                            {chats.length === 0 ? (
                                <p style={{ padding: '1rem', opacity: 0.5 }}>No history yet</p>
                            ) : (
                                chats.map((chat) => (
                                    <div key={chat._id} className="history-item" onClick={() => loadChat(chat)}>
                                        <div className="history-item-content">
                                            <div className="history-item-title">{chat.messages[0]?.text || 'New Conversation'}</div>
                                            <div className="history-item-date">{new Date(chat.updatedAt).toLocaleDateString()}</div>
                                        </div>
                                        <button 
                                            className="delete-history-btn" 
                                            onClick={(e) => handleDeleteChat(e, chat._id)}
                                            title="Delete conversation"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
