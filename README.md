# LedgerMind - Enterprise Inventory Management System

LedgerMind is a modern, enterprise-grade SaaS platform designed for comprehensive inventory management, sales tracking, and AI-driven business analytics. Built on Next.js 14 and Firebase, it features real-time data synchronization, robust role-based access control, and an embedded AI assistant ("Ledmi") powered by the Moonshot API.

## Features

- **Real-time Inventory Tracking:** Manage stock levels, view low-stock alerts, and categorize products effortlessly.
- **Ledmi AI Assistant:** A sophisticated, highly integrated AI that analyzes your specific business data, provides actionable insights, and can perform autonomous tasks like adding products or updating stock via function calling.
- **Sales & Ledger System:** Immutable logging of all stock movements and sales transactions.
- **Admin Hub:** Built-in administration panel for monitoring system health, managing user subscriptions, and tracking platform revenue.
- **Enterprise Security:** Row-level database rules, secure HTTP-only cookies, robust API route validation to prevent IDOR/BOLA attacks, and role-based route protection.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS, Shadcn/UI Component Library
- **Backend/Database:** Firebase Authentication, Firestore Database, Firebase Admin SDK
- **AI Integration:** Moonshot (Kimi) API `moonshot-v1-8k`
- **Deployment:** Vercel (Edge-ready)

## Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or pnpm or yarn
- Firebase Project setup with Authentication (Email/Password & Google Sign-on) and Firestore enabled

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Perez25882/ledgermindv1.git
   cd ledgermindv1
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Rename `.env.example` (if present) to `.env.local` and provide your configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=your_service_account_email
   FIREBASE_PRIVATE_KEY="your_private_key"
   
   KIMI_API_KEY=your_moonshot_api_key
   ```

4. **Deploy Firestore Security Rules:**
   Ensure database integrity by deploying the provided security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Access the application at `http://localhost:3000`.

## System Architecture

All authentication is handled via a secure handshake:
1. Client logs in via Firebase Auth.
2. An ID token is passed to `/api/auth/session` which issues a secure HTTP-Only `__session` cookie.
3. Next.js Middleware intercepts routes and ensures unauthenticated users are redirected.
4. Server Components and API Routes utilize the Firebase Admin SDK to decode the session cookie, extract the UID, and securely query Firestore data using strict `.where("user_id", "==", uid)` filtering.

## Contributing
When contributing to this repository, please ensure code maintains the enterprise standard. Strict TypeScript typings must be used, components should leverage the Shadcn design system, and all new API routes must validate user sessions.

## License
Proprietary Software - All Rights Reserved.
