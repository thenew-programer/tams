# Supabase Setup Guide for TAMS Chat Integration

## Quick Fix for the Current Error

The error `relation "maintenance_windows" does not exist` occurs because the `anomalies` table tries to reference `maintenance_windows` before it's created.

**Solution**: Use the fixed migration file `001_create_chat_schema_safe.sql` instead of the original one.

## Step-by-Step Setup

### 1. Create a New Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project
4. Wait for the project to be fully initialized

### 2. Get Your Supabase Credentials

1. Go to your project dashboard
2. Navigate to **Settings** > **API**
3. Copy your:
   - Project URL
   - Anon public key

### 3. Set Up Environment Variables

Create a `.env` file in your project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the Database Migration

**Option 1: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the content from `001_create_chat_schema_safe.sql`
4. Click "Run"

**Option 2: Using Supabase CLI**
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Run migrations
supabase db push
```

### 5. Deploy the Edge Function

1. Navigate to **Edge Functions** in your Supabase dashboard
2. Create a new function called `chat-ai`
3. Copy and paste the content from `supabase/functions/chat-ai/index.ts`
4. Deploy the function

**Or using CLI:**
```bash
# Deploy the Edge Function
supabase functions deploy chat-ai
```

### 6. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the Chat page in your application
3. Try asking questions like:
   - "Quelles sont les anomalies critiques?"
   - "Statistiques actuelles"
   - "Prochain arrêt maintenance"

### 7. Verify Database Tables

You can check if your tables were created correctly by going to:
- **Database** > **Tables** in your Supabase dashboard

You should see:
- `chat_messages`
- `anomalies`
- `maintenance_windows`

## Troubleshooting

### If you still get the foreign key error:

1. Drop the tables in the correct order:
   ```sql
   DROP TABLE IF EXISTS anomalies;
   DROP TABLE IF EXISTS maintenance_windows;
   DROP TABLE IF EXISTS chat_messages;
   ```

2. Run the `001_create_chat_schema_safe.sql` migration again

### If the Edge Function doesn't work:

1. Check the function logs in Supabase dashboard
2. Make sure your environment variables are set correctly
3. Verify the function is deployed and active

### If the chat doesn't connect:

1. Check your browser's console for errors
2. Verify your `.env` file has the correct credentials
3. Make sure your Supabase project is active

## Security Notes

- The current setup allows all authenticated users to read/write data
- For production, you should implement proper Row Level Security (RLS) policies
- Consider adding user authentication to restrict access

## Next Steps

1. Add user authentication
2. Implement proper RLS policies
3. Add more sophisticated AI responses
4. Set up production environment variables
