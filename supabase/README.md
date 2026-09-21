np# Store Helep — Supabase Database Setup Guide

This guide walks you through setting up and connecting the **Supabase** PostgreSQL database for **Store Helep**.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **"New project"**.
3. Set your project details:
   - **Name**: `Store-Helep` (or your preferred name)
   - **Database Password**: Choose a strong password and save it safely.
   - **Region**: Select the region closest to you (e.g., `West Europe`, `US East`, etc.).
4. Click **"Create new project"** and wait ~2 minutes for provisioning to finish.

---

## 2. Run Database Migrations (Schema)

1. In your Supabase project dashboard, navigate to the **SQL Editor** tab (left sidebar).
2. Click **"New query"**.
3. Open the file `supabase/schema.sql` in this project, copy its entire contents, and paste it into the Supabase SQL Editor.
4. Click **"Run"** (or press `Ctrl+Enter`).
5. Verify in **Table Editor** that the following tables have been created:
   - `businesses`
   - `business_settings`
   - `products`
   - `records`
   - `scans`
   - `scan_extracted_items`

---

## 3. Seed Initial Demo Data (Optional but Recommended)

1. In the Supabase **SQL Editor**, click **"New query"**.
2. Open `supabase/seed.sql`, copy its entire contents, and paste it into the editor.
3. Click **"Run"**.
4. This will populate:
   - Default business: **Mama General Store** (`mamageneral@store.com`)
   - **150+ categorized products** in Drinks, Groceries, Bakery, Household, Snacks, and Personal Care.
   - **30 days of sales records** for analytics and dashboard metrics.
   - Sample scans with extracted items for testing the review/confirm workflow.

---

## 4. Setup Storage Bucket for Receipt Scans

If you want uploaded scans/receipts to be hosted on Supabase Storage:
1. Go to the **Storage** tab in Supabase.
2. Click **"New bucket"**.
3. Name it: `receipt-scans`
4. Toggle **"Public bucket"** to **ON**.
5. Click **"Save"**.

*(Note: `supabase/schema.sql` also includes automatic SQL commands to configure bucket policies).*

---

## 5. Get Your Supabase API Keys & Configure `.env`

1. In Supabase, go to **Project Settings** -> **API** (or **Data API**).
2. Copy the following values:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **anon / public key**
   - **service_role key** (secret key under Project API keys)
3. In your local project root (`Store-Helep/`), copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Fill in the Supabase configuration variables in `.env`:
   ```env
   # Supabase Configuration
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y3JxdWR0cW95aWlwZmtpemFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTI5NjE2OSwiZXhwIjoyMTA0ODcyMTY5fQ.zwOA5vfB3D3e0PiKxG_ZS9T-aCzek0hw9CYEJ2skpIk
   ```

---

## 6. Run the Application

Start the backend server:

```bash
npm install
npm run dev
```

The application will detect your Supabase credentials and automatically connect to your Supabase PostgreSQL database!
