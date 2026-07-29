# 🎓 ASTU Helper - AI Chatbot System

ASTU Helper is a premium, full-stack **AI-powered chatbot system** custom-built for students and administrative coordinators at Adama Science and Technology University (ASTU). It leverages a custom-built **RAG (Retrieval-Augmented Generation)** pipeline to provide accurate, context-aware academic guidance, campus information, and student services.

---

## 👥 System Actors & Domain Roles

The ASTU Helper system is designed around specific actors who interact with the system's interface and data layers:

### 1. Students / General Users
*   **Role Description**: Students or guests seeking verified university information regarding courses, rules, events, and campus life.
*   **Capabilities & Operations**:
    *   **Secure Authentication**: Register and login securely using standard accounts or integrated Google OAuth.
    *   **Contextual Conversations**: Ask questions and receive real-time streamed responses powered by the RAG database.
    *   **Session Management**: View past conversation histories and delete specific chat sessions.
*   **Domain Data Contained**:
    *   *User Profile*: Name, email, hashed credentials, and role status (`user`).
    *   *Chat Threads*: List of conversation logs, system answers, and user prompts tied uniquely to their account.

### 2. Administrators / Coordinators
*   **Role Description**: Faculty members, IT staff, or administrators responsible for updating university guidelines and monitoring system usage.
*   **Capabilities & Operations**:
    *   **Knowledge Base Management**: Upload official PDF documents, submit university website URLs for automatic indexing, or paste raw text.
    *   **Document Lifecycle Tracking**: Monitor the live status of document parsing (Pending, Processing, Indexed, or Failed).
    *   **User & Role Management**: Promote standard users to administrators or deactivate profiles.
    *   **System Event Tracking**: View recent user registrations and activity alerts.
*   **Domain Data Contained**:
    *   *Document Metadata*: Files, source URLs, content chunks, and parsing state logs.
    *   *System Notifications*: Auditable notifications representing system-wide changes (e.g. user signups).

### 3. AI Orchestrator (System Agent)
*   **Role Description**: The automated processing unit that acts as the bridge between raw documents, user questions, and the Gemini Large Language Model.
*   **Capabilities & Operations**:
    *   **Text Embedding Generation**: Converts parsed document chunks into vector embeddings.
    *   **Semantic Search & Retrieval**: Matches user query vectors with document vectors to retrieve relevant context.
    *   **Context Assembly**: Generates detailed system prompts utilizing retrieved contexts to feed the generative AI.
*   **Domain Data Contained**:
    *   *Vector Database Chunks*: Structured text passages stored with associated vector coordinates.

---

## 🌟 Key Features

### 👤 Student/User Features
*   💬 **Intelligent RAG-powered Chat**: Real-time conversations with our specialized campus AI.
*   ⚡ **Streamed Responses**: Instant, low-latency typewriter effect for AI answers.
*   ⏳ **Conversational History**: Store, review, and manage previous chat histories.
*   🔒 **Dual Authentication**: Secure sign-up/login via standard JWT or one-click Google OAuth.

### 🔑 Admin/Coordinator Features
*   📁 **RAG Knowledge Base Control**: Admins can upload PDFs, index external university URLs, or paste raw text to feed the AI's database.
*   📊 **Real-time Document Tracking**: Monitor indexing status (processing, successfully indexed, or failed) in a clean table view.
*   🔔 **System Alerts**: Live signup and system state notifications for site administrators.

---

## ⚙️ Tech Stack & Tools Used

### 🖥️ Frontend (Client Tools)
*   **Framework**: [Next.js](https://nextjs.org/) (React 19, TypeScript) for SSR/ISR and optimized routing.
*   **Styling & UI**: Custom Vanilla CSS with modern Glassmorphism architecture and CSS Variables for global state styling.
*   **Authentication Integration**: `@react-oauth/google` for streamlined OAuth sign-in flow.
*   **State & API Hooks**: React Context API, native Hooks (`useState`, `useEffect`, `useRef`), and native Fetch API.

### 🔌 Backend (Server Tools)
*   **Runtime Environment**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/) for building modular and scalable REST APIs. **Express was chosen because it is lightweight, unopinionated, and provides robust routing middleware support, making it ideal for integrating custom RAG flows, Passport authentication, and document processing.**
*   **AI & RAG Engine**: LangChain framework alongside `@google/generative-ai` (Gemini Pro & Embedding models).
*   **Document Scrapers & Parsers**: `pdf-parse` (for reading PDF files), `cheerio` (for crawling and indexing URL pages), and `multer` (for handling multi-part file uploads).
*   **Security & Encryption**: `jsonwebtoken` (JWT creation), `bcryptjs` (password hashing), and `passport` / `passport-google-oauth20` (Google OAuth strategy).

### 🗄️ Database (DB Tools)
*   **Database Service**: [MongoDB Atlas](https://www.mongodb.com/atlas) for managed cloud NoSQL database clustering.
*   **Data Modeling & ORM/ODM**: [Mongoose](https://mongoosejs.com/) for strict schema mapping and structured query operations.
*   **Vector Database Store**: MongoDB Atlas Vector Search indices to store and retrieve high-dimensional vector embeddings for context matching.

---

## 🛠️ Local Development

### 1. Backend Setup
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start development server:
   ```bash
   npm run dev
   ```

### 2. Frontend Setup
1. Navigate to the client folder:
   ```bash
   cd ../client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---
Demo : https://chatbot-mauve-pi-87.vercel.app
## 🧑‍💻 Author

**Yehwala Obssi**  
*Computer Science and Engineering Student*  
*Adama Science and Technology University (ASTU)*

Developed as a modern capstone concept illustrating the potential of context-aware LLMs to transform academic assistance and campus navigation.


