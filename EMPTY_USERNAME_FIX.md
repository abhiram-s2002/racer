# Empty Username Foreign Key Constraint Fix

## Problem
Users were experiencing a foreign key constraint error when logging into the app:
```
ERROR Supabase upsert error: {"code": "23503", "details": "Key (username)=() is still referenced from table \"user_streaks\".", "hint": null, "message": "update or delete on table \"users\" violates foreign key constraint \"user_streaks_username_fkey\" on table \"user_streaks\""}
```

## Root Cause
The issue was caused by the authentication flow trying to create user records with empty usernames, and then the rewards system attempting to create `user_streaks` records that reference these empty usernames, violating the foreign key constraint.

### Specific Issues:
1. **Auth Flow**: The login process was trying to upsert user profiles even when username was empty
2. **Rewards System**: The `useRewards` hook was being called with empty usernames
3. **Database**: Records with empty usernames were being created in the database

## Solution

### 1. Fixed Authentication Flow (`app/auth.tsx`)
- Removed automatic upsert calls during login
- Added proper profile setup redirection for users without complete profiles
- Users now go to `/ProfileSetup` if they don't have a username or name

### 2. Enhanced User Profile Validation (`app/_layout.tsx`)
- Improved `upsertUserProfile` function to properly handle missing fields
- Removed unnecessary alerts that could interrupt the user flow
- Better error handling for profile validation

### 3. Protected Rewards System (`hooks/useRewards.ts`)
- Added username validation in `loadRewardsData` and `refreshRewards` functions
- Prevents rewards system from running when username is empty
- Added logging for debugging purposes

### 4. Enhanced Rewards Functions (`utils/rewardsSupabase.ts`)
- Added username validation in `initializeUserRewards` function
- Added username validation in `getCompleteRewardsDataSafe` function
- Prevents creation of records with empty usernames

### 5. Database Cleanup (`FIX_EMPTY_USERNAMES.sql`)
- Created SQL script to clean up any existing records with empty usernames
- Removes orphaned records from all rewards-related tables
- Verifies cleanup was successful

## Files Modified

### Core Changes:
- `app/auth.tsx` - Fixed login flow to prevent empty username creation
- `app/_layout.tsx` - Enhanced profile validation and error handling
- `hooks/useRewards.ts` - Added username validation to prevent empty username processing
- `utils/rewardsSupabase.ts` - Added validation to prevent empty username record creation

### New Files:
- `FIX_EMPTY_USERNAMES.sql` - Database cleanup script
- `EMPTY_USERNAME_FIX.md` - This documentation

## How to Apply the Fix

### For Development:
1. The code changes will prevent the issue from occurring
2. No additional steps needed

### For Production (if issue exists):
1. Run the database cleanup script: `FIX_EMPTY_USERNAMES.sql`
2. Deploy the updated code
3. Test login flow with new users

## Testing

### Test Cases:
1. **New User Signup**: Should redirect to profile setup, not create empty username records
2. **Existing User Login**: Should work normally if profile is complete
3. **Incomplete Profile**: Should redirect to profile setup
4. **Rewards Tab**: Should not crash when username is empty

### Verification:
- No foreign key constraint errors during login
- Users with incomplete profiles are properly redirected
- Rewards system only runs for users with valid usernames
- No empty username records in database

## Prevention

### Future Safeguards:
1. **Database Constraints**: Consider adding NOT NULL constraints on username fields
2. **Validation**: All username-dependent functions now validate input
3. **Error Handling**: Better error messages and logging for debugging
4. **Profile Flow**: Clear separation between auth and profile setup

## Impact

### Positive:
- Eliminates foreign key constraint errors
- Improves user experience with proper profile setup flow
- Prevents database corruption from empty usernames
- Better error handling and logging

### Minimal:
- No breaking changes to existing functionality
- Backward compatible with existing users
- Performance impact is negligible

## Monitoring

### Watch For:
- Any remaining foreign key constraint errors
- Users getting stuck in profile setup
- Rewards system errors for valid users
- Database records with empty usernames

### Logs to Monitor:
- "Skipping rewards data load - username is empty"
- "Cannot initialize rewards - username is empty"
- "Cannot get complete rewards data - username is empty" 