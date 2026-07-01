'use client';

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Chatbot from "@/components/Chatbot";
import AuthGuard from "@/components/AuthGuard";

export default function Home() {
  return (
    <AuthGuard requiredRole="user">
      <div className="page">
        <Navbar />

        <main className="main">
          {/* Hero Section */}
          <section className="hero">
            <div className="container hero-content">
              <h1 className="hero-title gradient-text">
                AI Assistance for ASTU Students
              </h1>
              <p className="hero-subtitle">
                Get instant answers about campus life, academics, and resources with ASTU&apos;s AI-powered Helper Chatbot.
              </p>
              <div className="hero-actions">
                <Link href="#features" className="btn btn-primary">
                  Get Started
                </Link>
              </div>
            </div>

            {/* Abstract Background Elements */}
            <div className="hero-bg-circle circle-1"></div>
            <div className="hero-bg-circle circle-2"></div>
          </section>

          {/* Features Section */}
          <section id="features" className="features">
            <div className="container">
              <h2 className="section-title">Why use ASTU Helper?</h2>
              <div className="grid">
                <div className="feature-card glass">
                  <h3>🚀 Instant Answers</h3>
                  <p>No more waiting in lines. Get immediate responses to your queries 24/7.</p>
                </div>
                <div className="feature-card glass">
                  <h3>📚 Knowledge Base</h3>
                  <p>Access a vast library of documents and resources instantly.</p>
                </div>
                <div className="feature-card glass">
                  <h3>🔒 Secure & Private</h3>
                  <p>Your interactions are secure and private, ensuring a safe environment.</p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Chatbot />

        <footer className="footer">
          <div className="container">
            <p>© 2026 ASTU Helper. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </AuthGuard>
  );
}
