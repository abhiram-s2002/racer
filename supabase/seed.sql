-- Seed mock data for users
INSERT INTO users (username, name, email, avatar_url, phone, bio, location, isAvailable) VALUES
  ('alice', 'Alice Smith', 'alice@example.com', 'https://avatars.dicebear.com/api/identicon/alice.svg', '+1234567890', 'Friendly seller with great items!', 'New York, NY', true),
  ('bob', 'Bob Johnson', 'bob@example.com', 'https://avatars.dicebear.com/api/identicon/bob.svg', '+1234567891', 'Reliable seller with quality products', 'Los Angeles, CA', true),
  ('carol', 'Carol Lee', 'carol@example.com', 'https://avatars.dicebear.com/api/identicon/carol.svg', '+1234567892', 'Passionate about finding good deals', 'Chicago, IL', true)
ON CONFLICT (username) DO NOTHING;

-- Seed mock data for listings
INSERT INTO listings (username, title, description, price, category, images, latitude, longitude) VALUES
  ('alice', 'Vintage Lamp', 'A beautiful vintage lamp in excellent condition. Perfect for home decoration.', 49.99, 'home', ARRAY['https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Vintage+Lamp'], 40.7128, -74.0060),
  ('bob', 'Mountain Bike', 'A sturdy mountain bike perfect for outdoor adventures. Well maintained.', 299.99, 'sports', ARRAY['https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=Mountain+Bike'], 34.0522, -118.2437),
  ('carol', 'Cookbook Collection', 'A collection of delicious recipes from around the world. Great for food lovers.', 19.99, 'books', ARRAY['https://via.placeholder.com/400x300/45B7D1/FFFFFF?text=Cookbook'], 41.8781, -87.6298)
ON CONFLICT DO NOTHING;

-- Update existing records with location data
UPDATE listings
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL; 

-- Seed data for achievements (sorted by difficulty and category)
INSERT INTO achievements (id, title, description, icon, category, max_progress, omni_reward, rarity, is_active) VALUES

-- ============================================================================
-- EASY ACHIEVEMENTS (Common, Low Progress Required)
-- ============================================================================

-- Special achievements (Easy - Automatic)
('welcome_bonus', 'Welcome Bonus', 'Claim your welcome bonus', 'Gift', 'special', 1, 50, 'common', true),

-- Sales achievements (Easy - First Steps)
('first_list', 'First List', 'Create your first listing on the marketplace', 'ShoppingBag', 'sales', 1, 100, 'common', true),

-- Social achievements (Easy - Basic Engagement)
('social_butterfly', 'Social Butterfly', 'Send 20 messages', 'MessageCircle', 'social', 20, 200, 'common', true),

-- ============================================================================
-- MEDIUM ACHIEVEMENTS (Rare, Moderate Progress Required)
-- ============================================================================

-- Social achievements (Medium - Community Building)
('networker', 'Networker', 'Have 10 successful pings', 'Users', 'social', 10, 300, 'rare', true),
('referral_king', 'Referral King', 'Successfully refer 5 friends', 'Users', 'special', 5, 400, 'epic', true),

-- Engagement achievements (Medium - Responsiveness)
('responsive_seller', 'Responsive Seller', 'Respond to pings within 1 hour', 'Clock', 'engagement', 10, 250, 'rare', true),

-- Milestone achievements (Medium - Consistency)
('streak_master', 'Streak Master', 'Maintain a 7-day check-in streak', 'Flame', 'special', 7, 200, 'rare', true),

-- Sales achievements (Medium - Growing Business)
('listing_master', 'Listing Master', 'Create 10 listings', 'ShoppingBag', 'sales', 10, 500, 'rare', true),

-- ============================================================================
-- HARD ACHIEVEMENTS (Epic/Legendary, High Progress Required)
-- ============================================================================

-- Milestone achievements (Hard - Long-term Commitment)
('loyal_user', 'Loyal User', 'Use the platform for 30 consecutive days', 'Calendar', 'milestone', 30, 500, 'epic', true),
('power_user', 'Power User', 'Earn 1000 OMNI tokens', 'Crown', 'milestone', 1000, 100, 'rare', true),

-- Social achievements (Hard - Community Leadership)
('community_leader', 'Community Leader', 'Have 50 successful pings', 'Users', 'social', 50, 800, 'epic', true),

-- Sales achievements (Hard - Business Mastery)
('top_seller', 'Top Seller', 'Complete 50 sales', 'ShoppingBag', 'sales', 50, 1000, 'epic', true)

ON CONFLICT (id) DO NOTHING; 