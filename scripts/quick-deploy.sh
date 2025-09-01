#!/bin/bash

echo "🚀 Quick Deploy: Leaderboard System"
echo "=================================="

# Step 1: Deploy database migration
echo "📊 Deploying database migration..."
supabase db push

# Step 2: Deploy Edge Function
echo "⚡ Deploying Edge Function..."
supabase functions deploy update-leaderboard

# Step 3: Set up cron job (every 6 hours)
echo "⏰ Setting up automatic updates (every 6 hours)..."
supabase functions schedule update-leaderboard "0 */6 * * *"

# Step 4: Verify deployment
echo "✅ Verifying deployment..."
supabase functions list | grep update-leaderboard
supabase functions schedule list | grep update-leaderboard

echo ""
echo "🎉 Leaderboard system deployed successfully!"
echo ""
echo "📅 Schedule: Every 6 hours (6 AM, 12 PM, 6 PM, 12 AM)"
echo "🔗 Function: https://your-project.supabase.co/functions/v1/update-leaderboard"
echo "📊 Monitor: supabase functions logs update-leaderboard"
echo ""
echo "🚀 Ready for production!"
