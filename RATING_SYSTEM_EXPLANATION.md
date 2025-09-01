# Rating System Explanation

## 🎯 **How the Rating System Works**

The rating system allows users to rate each other based on their marketplace interactions (pings). Here's how it works:

### **Rating Eligibility Rules**

1. **One Rating Per Ping**: Users can only rate each other **once per ping interaction**
2. **Different Pings = Different Ratings**: Users **CAN** rate the same person multiple times for **different ping interactions**
3. **Completed Interactions Only**: Users can only rate after ping interactions are completed (accepted/rejected)
4. **No Self-Rating**: Users cannot rate themselves
5. **Recent Interactions**: Only interactions from the last 90 days are eligible for rating

### **Example Scenarios**

#### ✅ **Allowed - Multiple Ratings for Same User**

```
User A sends ping to User B for Listing 1 → User A can rate User B
User A sends ping to User B for Listing 2 → User A can rate User B again
User A receives ping from User B for Listing 3 → User A can rate User B again
```

#### ❌ **Not Allowed - Duplicate Ratings**

```
User A sends ping to User B for Listing 1 → User A rates User B (5 stars)
User A tries to rate User B again for the same ping → Blocked (already rated)
```

### **Database Structure**

The `user_ratings` table enforces these rules:

```sql
CREATE TABLE user_ratings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rater_username text NOT NULL REFERENCES users(username),
    rated_username text NOT NULL REFERENCES users(username),
    ping_id uuid NOT NULL REFERENCES pings(id),
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text text,
    category text NOT NULL DEFAULT 'general',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    -- Key constraint: One rating per user per ping
    UNIQUE(rater_username, ping_id),
    
    -- Users cannot rate themselves
    CHECK (rater_username != rated_username)
);
```

### **Rating Categories**

Users can categorize their ratings:
- `general` - Overall experience
- `communication` - How well the user communicated
- `reliability` - How reliable the user was
- `quality` - Quality of items/service
- `speed` - How quickly the user responded

### **Rating Statistics**

The system automatically calculates:
- **Average Rating**: Overall rating score (1-5 stars)
- **Total Ratings**: Number of ratings received
- **Rating Distribution**: Breakdown of 1-star, 2-star, 3-star, 4-star, and 5-star ratings

### **Security Features**

- **Row-Level Security (RLS)**: Users can only see and modify their own ratings
- **Authentication Required**: Only logged-in users can submit ratings
- **Input Validation**: Ratings must be 1-5, review text 10-500 characters
- **Rate Limiting**: Prevents spam through the ping system

### **How to Use**

1. **Check Eligibility**: Use `canRateUser()` to see if rating is allowed
2. **Submit Rating**: Use `submitRating()` with ping ID and rating data
3. **View Ratings**: Use `getUserRatings()` to see all ratings for a user
4. **Update Rating**: Use `updateRating()` to modify existing ratings
5. **Delete Rating**: Use `deleteRating()` to remove ratings

### **Benefits of This System**

1. **Fair Rating**: Users can rate each interaction separately
2. **Prevents Abuse**: No duplicate ratings for same interaction
3. **Accurate Feedback**: Multiple ratings provide better user reputation
4. **Flexible**: Different categories for different aspects of interaction
5. **Secure**: Proper authentication and authorization

### **Migration Required**

To enable the rating system, run the migration file:
```sql
-- Run this in your Supabase SQL Editor
\i supabase/migrations/20250124_add_rating_system.sql
```

This will create:
- `user_ratings` table
- `can_rate_user()` function
- `get_user_rating_stats()` function
- Proper indexes and security policies

### **Testing the System**

After migration, you can test with:

```sql
-- Check if user can rate another user
SELECT * FROM can_rate_user('user1', 'user2');

-- Get user rating statistics
SELECT * FROM get_user_rating_stats('user1');

-- View all ratings for a user
SELECT * FROM user_ratings WHERE rated_username = 'user1';
```

**Important Note**: The function parameters are:
- `can_rate_user(rater_username_param, rated_username_param)`
- `get_user_rating_stats(target_username)`

Make sure to use the correct parameter names when calling these functions.

The rating system is now fully functional and allows users to build reputation through multiple positive interactions while preventing rating abuse.
