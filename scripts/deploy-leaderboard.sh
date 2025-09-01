#!/bin/bash

# Deploy Leaderboard Function and Setup Cron Job
echo "🚀 Deploying Leaderboard Function..."

# Deploy the Edge Function
supabase functions deploy update-leaderboard

# Set up the cron job (runs every 6 hours)
echo "⏰ Setting up cron job for every 6 hours..."
supabase functions schedule update-leaderboard "0 */6 * * *"

echo "✅ Leaderboard function deployed and scheduled!"
echo "📅 Will run automatically every 6 hours"
echo "🔗 Function URL: https://your-project.supabase.co/functions/v1/update-leaderboard"
