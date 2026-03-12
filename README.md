# ASTU Helper - AI Chatbot System

## Overview

ASTU Helper is a comprehensive **full-stack AI-powered chatbot system** designed for students. It provides intelligent responses by leveraging a RAG (Retrieval-Augmented Generation) pipeline, allowing users to interact with a knowledge base stored in a database.

The project is split into two main components:
- **Client**: A modern Next.js frontend with a responsive chat interface and an admin dashboard.
- **Server**: A robust Node.js/Express backend that handles authentication, document processing, and AI interaction.

---

## Features

### User Features
- **Interactive Chat**: Real-time conversations with the ASTU AI Assistant.
- **Chat History**: Users can view and delete their previous conversations.
- **Streamed Responses**: Fast, real-time typing effect for AI answers.
- **Authentication**: Secure login and signup with JWT and optional Google OAuth.

### Admin Features
- **Knowledge Base Management**: Admins can upload PDFs, index URLs, or paste text to expand the AI's knowledge.
- **Document Tracking**: Monitor the status of indexed documents (processing, indexed, failed).
- **Secure Access**: Restricted dashboard for authorized administrators only.

---

## Tech Stack

### Frontend (Client)
- **Framework**: [Next.js](https://nextjs.org/)
- **UI Architecture**: React (19.2) with server/client components.
- **Styling**: Vanilla CSS with modern glassmorphism aesthetics.
- **Authentication**: Managed via JWT stored in local storage.

### Backend (Server)
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with Mongoose.
- **RAG Implementation**: Custom document indexing and retrieval logic.
- **Security**: JWT-based authentication and Bcrypt for password hashing.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- NPM or Yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yeob9912/Chatbot.git
   cd Chatbot
   ```

2. **Server Setup**:
   ```bash
   cd server
   npm install
   # Create a .env file based on the provided environment variables
   npm run dev
   ```

3. **Client Setup**:
   ```bash
   cd ../client
   npm install
   # Create a .env file with NEXT_PUBLIC_API_URL
   npm run dev
   ```

---

## Project Structure

```text
Chatbot/
├── client/           # Next.js frontend
│   ├── src/app/      # App router pages
│   ├── src/components/ # Reusable UI components
│   └── public/       # Static assets
└── server/           # Express backend
    ├── controllers/  # Route logic
    ├── models/       # Mongoose schemas
    ├── routes/       # API endpoints
    └── middleware/   # Auth and error handling
```

---

## Author

**Yehwala Obssi**  
Computer Science and Engineering Student  

Developed as an innovative project to demonstrate the potential of AI in educational environments using modern web technologies.
