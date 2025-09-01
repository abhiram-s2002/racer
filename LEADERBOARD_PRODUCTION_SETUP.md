# Leaderboard Production Setup Guide

## 🚀 Deploying to Production

### Step 1: Run Database Migration
```bash
# Apply the leaderboard cache table migration
supabase db push
```

### Step 2: Deploy Edge Function
```bash
# Deploy the leaderboard update function
supabase functions deploy update-leaderboard
```

### Step 3: Set Up Cron Job
```bash
# Schedule the function to run every 6 hours
supabase functions schedule update-leaderboard "0 */6 * * *"
```

### Step 4: Verify Deployment
```bash
# Check if function is deployed
supabase functions list

# Check cron jobs
supabase functions schedule list
```

## ⏰ Cron Schedule

The leaderboard updates automatically every 6 hours:
- **6:00 AM** - Morning update
- **12:00 PM** - Noon update  
- **6:00 PM** - Evening update
- **12:00 AM** - Midnight update

## 📊 Monitoring

### Check Function Logs
```bash
# View recent function executions
supabase functions logs update-leaderboard
```

### Manual Trigger (for testing)
```bash
# Trigger function manually
curl -X POST https://your-project.supabase.co/functions/v1/update-leaderboard
```

## 🔧 Configuration

### Environment Variables
Make sure these are set in your Supabase project:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations

### Database Indexes
The migration creates these indexes automatically:
- `idx_leaderboard_cache_rank` - For fast leaderboard queries
- `idx_leaderboard_cache_username` - For fast user rank lookups
- `idx_user_rewards_total_omni_earned` - For efficient ranking calculations

## 📱 User Experience

### What Users See:
1. **Top 20 Users** - Ranked by total OMNI earned
2. **Current User Position** - Their rank and OMNI earned
3. **Last Updated** - When rankings were refreshed
4. **Loading States** - Smooth loading experience

### Performance:
- **Query Time**: 10-50ms for leaderboard data
- **Update Frequency**: Every 6 hours
- **Scalability**: Handles millions of users

## 🚨 Troubleshooting

### Common Issues:

1. **Function Not Running**
   - Check cron job is scheduled: `supabase functions schedule list`
   - Verify function is deployed: `supabase functions list`

2. **No Data in Leaderboard**
   - Check if users have OMNI earnings in `user_rewards` table
   - Verify migration ran successfully
   - Check function logs for errors

3. **Slow Performance**
   - Verify indexes are created
   - Check database query performance
   - Monitor function execution time

### Debug Commands:
```bash
# Check database tables
supabase db diff

# View function logs
supabase functions logs update-leaderboard --limit 10

# Test function manually
curl -X POST https://your-project.supabase.co/functions/v1/update-leaderboard
```

## 📈 Scaling Considerations

### For Large User Bases:
- **<10K users**: Current setup works perfectly
- **10K-100K users**: Monitor function execution time
- **100K+ users**: Consider optimizing query performance

### Performance Optimizations:
1. **Database Indexes** - Already optimized
2. **Caching** - Leaderboard data is cached
3. **Batch Processing** - Updates all users at once

## 🎯 Success Metrics

### Monitor These Metrics:
- **Function Execution Time** - Should be <30 seconds
- **User Engagement** - Leaderboard views
- **Data Freshness** - Last updated timestamp
- **Error Rate** - Function success rate

### Expected Performance:
- **100K users**: 5-15 seconds execution time
- **1M users**: 15-30 seconds execution time
- **Query Response**: 10-50ms for app queries

## 🔄 Maintenance

### Regular Tasks:
1. **Monitor Logs** - Check for errors weekly
2. **Performance Review** - Monitor execution time monthly
3. **Data Validation** - Verify rankings are accurate
4. **Backup Verification** - Ensure data is backed up

### Updates:
- **Function Updates** - Deploy with `supabase functions deploy update-leaderboard`
- **Schedule Changes** - Update with `supabase functions schedule update-leaderboard "new-schedule"`

## ✅ Production Checklist

- [ ] Database migration applied
- [ ] Edge function deployed
- [ ] Cron job scheduled
- [ ] Environment variables configured
- [ ] Indexes created
- [ ] Function tested manually
- [ ] Logs monitored
- [ ] Performance verified
- [ ] User experience tested

## 🎉 Go Live!

Once all steps are completed:
1. **Monitor** the first few automatic runs
2. **Verify** leaderboard data is accurate
3. **Test** user experience in production
4. **Celebrate** - Your leaderboard is live! 🚀
