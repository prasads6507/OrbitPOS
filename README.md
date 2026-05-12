# OrbitPOS - Production-Ready Cloud POS

OrbitPOS is a modern, high-performance Point of Sale system built for retail businesses.

## Features

- **Real-time Syncing**: Instant updates across all devices using Supabase Realtime.
- **POS Checkout**: fast, tablet-friendly interface with barcode scanning support.
- **Inventory Management**: Track stock levels, low stock alerts, and adjustment logs.
- **Role-Based Access**: Specialized dashboards for Admins, Cashiers, and Employees.
- **Attendance & Payroll**: Clock in/out system with automatic wage calculation.
- **Payments**: Integrated Stripe test mode for secure card processing.
- **Receipts**: Automated PDF generation and email receipts via Resend.
- **Reporting**: Comprehensive sales and employee performance analytics.

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- **State**: Zustand
- **Backend**: Next.js Server Actions & API Routes
- **Database**: Supabase (PostgreSQL + Realtime)
- **Auth**: Supabase Auth
- **Payments**: Stripe
- **Emails**: Resend
- **Charts**: Recharts
- **PDF**: jsPDF

## Getting Started

### 1. Prerequisites

- Node.js 18+
- Supabase Account (Free Tier)
- Stripe Account (Test Mode)
- Resend Account (Free Tier)

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_test_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_test_publishable_key

# Resend
RESEND_API_KEY=your_resend_api_key
```

### 3. Database Setup

Run the SQL script found in `src/database/schema.sql` in your Supabase SQL Editor.

### 4. Installation

```bash
npm install
npm run dev
```

## Deployment

Deploy to Vercel with a single click. Ensure all environment variables are added in the Vercel dashboard.

## License

MIT
