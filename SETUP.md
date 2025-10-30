# LedgerMind Supabase - Local Development Setup

This project is a comprehensive inventory and sales management system built with Next.js and Supabase.

## Quick Start

### Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier available)

### 1. Dependencies Installation ✅
Dependencies have been installed with `npm install --legacy-peer-deps`

### 2. Supabase Setup

#### Option A: Use Supabase Cloud (Recommended)
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Copy your project URL and anon key from the project settings

#### Option B: Local Supabase (Advanced)
1. Install Supabase CLI: `npm install -g supabase`
2. Run: `supabase init`
3. Run: `supabase start`

### 3. Environment Configuration
1. Open `.env.local` file in the project root
2. Replace the placeholder values with your actual Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
   ```

### 4. Database Setup
1. In your Supabase dashboard, go to the SQL Editor
2. Copy and paste the contents of `scripts/001_create_tables.sql` and run it
3. Optionally run `scripts/002_create_functions.sql` for additional functions
4. Optionally run `scripts/003_seed_data.sql` for sample data

### 5. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

- `/app` - Next.js 13+ app router pages
- `/components` - Reusable React components
- `/lib` - Utility functions and Supabase client
- `/scripts` - Database setup scripts
- `/hooks` - Custom React hooks

## Features

- **Authentication**: User registration and login
- **Inventory Management**: Track products, categories, and stock levels
- **Sales Tracking**: Record and manage sales transactions
- **AI Insights**: Automated business insights and recommendations
- **Reports**: Revenue and inventory analytics
- **Dashboard**: Comprehensive business overview

## Troubleshooting

### Dependency Issues
If you encounter React version conflicts, use:
```bash
npm install --legacy-peer-deps
```

### Supabase Connection Issues
1. Verify your environment variables in `.env.local`
2. Check that your Supabase project is active
3. Ensure RLS policies are properly set up

### Build Issues
The project has TypeScript and ESLint errors ignored during builds for development purposes.

## Next Steps

1. Set up your Supabase project and database
2. Configure your environment variables
3. Start the development server
4. Begin customizing the application for your needs

## Support

You can:
- Modify the existing components
- Add new pages and functionality
- Extend the database schema as needed
