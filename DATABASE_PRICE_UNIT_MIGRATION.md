# Database Migration: Price Unit Feature

## Overview
This migration adds support for category-specific pricing units to the marketplace listings. Users can now specify how their items or services are priced (e.g., per kg, per hour, per piece).

## Database Changes

### 1. New Migration File: `20250118_add_price_unit.sql`

#### Table Changes:
- **Add `price_unit` column** to `listings` table
  - Type: `text`
  - Default: `'per_item'`
  - Nullable: `true`

#### Indexes:
- **New index** on `listings(price_unit)` for better query performance

#### Functions:
- **`validate_price_unit(category_param, price_unit_param)`**: Validates price units against categories
- **`validate_listing_price_unit()`**: Trigger function for automatic validation

#### Triggers:
- **`trigger_validate_price_unit`**: Validates price_unit on INSERT/UPDATE

#### Updated Functions:
- **`get_listings_with_distance()`**: Now includes `price_unit` in return data

### 2. Category-Specific Price Units

| Category | Valid Price Units |
|----------|------------------|
| Groceries | per_kg, per_piece, per_pack, per_bundle |
| Fruits | per_kg, per_dozen, per_piece, per_basket |
| Food | per_plate, per_serving, per_piece, per_kg |
| Services | per_hour, per_service, per_session, per_day |
| Art | per_piece, per_commission, per_hour, per_project |
| Rental | per_day, per_week, per_month, per_hour |

### 3. Application Changes

#### Updated Interfaces:
- **`Listing` interface**: Added `price_unit?: string`
- **`ListingActivity` interface**: Added `price_unit?: string`
- **`PingActivity` interface**: Added `price_unit?: string`

#### New Helper Function:
- **`formatPriceWithUnit(price, priceUnit)`**: Formats price display with unit labels

#### Updated Components:
- **AddListingModal**: Horizontal price unit selector
- **Home Screen**: Price display with units
- **Seller Profile**: Price display with units
- **Activity Screen**: Price display with units
- **PingItem**: Price display with units

## Migration Steps

### 1. Run Database Migrations
```bash
# Apply the price unit migration
supabase db push

# Apply the ping function fix (if needed)
# This fixes the "INSERT has more target columns than expressions" error
```

### 2. Fix Ping Creation Issue
If you encounter the error "INSERT has more target columns than expressions" when creating pings, run the additional migration:

```sql
-- Fix the create_ping_with_limits function
DROP FUNCTION IF EXISTS create_ping_with_limits(uuid, text, text, text);

CREATE OR REPLACE FUNCTION create_ping_with_limits(
    listing_id_param uuid,
    sender_username_param text,
    receiver_username_param text,
    message_param text
)
RETURNS TABLE(
    success boolean,
    ping_id uuid,
    message text,
    created_at timestamp with time zone
) AS $$
DECLARE
    limit_check RECORD;
    time_check RECORD;
    new_ping_id uuid;
    new_created_at timestamp with time zone;
BEGIN
    -- Check ping limits
    SELECT * INTO limit_check 
    FROM check_ping_limits(sender_username_param);
    
    IF NOT limit_check.can_send THEN
        RETURN QUERY SELECT 
            false as success,
            NULL::uuid as ping_id,
            limit_check.message,
            NULL::timestamp with time zone as created_at;
        RETURN;
    END IF;
    
    -- Check time limit
    SELECT * INTO time_check 
    FROM check_ping_time_limit(sender_username_param, listing_id_param);
    
    IF NOT time_check.can_ping THEN
        RETURN QUERY SELECT 
            false as success,
            NULL::uuid as ping_id,
            time_check.message,
            NULL::timestamp with time zone as created_at;
        RETURN;
    END IF;
    
    -- Create the ping with explicit column specification
    INSERT INTO pings (
        listing_id, 
        sender_username, 
        receiver_username, 
        message,
        status,
        ping_count,
        last_ping_at,
        created_at
    )
    VALUES (
        listing_id_param, 
        sender_username_param, 
        receiver_username_param, 
        message_param,
        'pending',
        1,
        NOW(),
        NOW()
    )
    RETURNING id, created_at INTO new_ping_id, new_created_at;
    
    -- Update ping count
    UPDATE ping_limits 
    SET daily_pings_sent = daily_pings_sent + 1
    WHERE username = sender_username_param;
    
    RETURN QUERY SELECT 
        true as success,
        new_ping_id as ping_id,
        'Ping created successfully' as message,
        new_created_at as created_at;
END;
$$ LANGUAGE plpgsql;
```

### 2. Update Existing Data
The migration automatically sets existing listings to have `price_unit = 'per_item'`.

### 3. Verify Migration
```sql
-- Check that the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'listings' AND column_name = 'price_unit';

-- Check that existing listings have the default value
SELECT COUNT(*) FROM listings WHERE price_unit IS NULL;
```

## Validation Rules

### Database-Level Validation:
- Price units are validated against the listing category
- Invalid combinations raise database exceptions
- Default fallback to `'per_item'` for unknown categories

### Application-Level Validation:
- Frontend enforces category-specific price unit options
- Graceful fallback for missing or invalid price units
- Consistent display formatting across all components

## Backward Compatibility

- **Existing listings**: Automatically get `price_unit = 'per_item'`
- **API responses**: Include `price_unit` field (nullable)
- **Frontend display**: Shows simple price if no unit specified
- **Database queries**: Work with or without price_unit filter

## Performance Considerations

- **Index on price_unit**: Improves filtering performance
- **Minimal storage impact**: Text field with small values
- **Query optimization**: Price unit filtering uses indexed column

## Testing

### Database Tests:
```sql
-- Test valid price units
INSERT INTO listings (title, price, category, price_unit, username) 
VALUES ('Test Item', '100', 'groceries', 'per_kg', 'test_user');

-- Test invalid price unit (should fail)
INSERT INTO listings (title, price, category, price_unit, username) 
VALUES ('Test Item', '100', 'groceries', 'per_hour', 'test_user');
```

### Application Tests:
- Create listings with different categories and price units
- Verify price display formatting
- Test price unit selector functionality
- Validate form submission with price units

## Rollback Plan

If rollback is needed:
```sql
-- Remove the price_unit column
ALTER TABLE listings DROP COLUMN IF EXISTS price_unit;

-- Drop the index
DROP INDEX IF EXISTS idx_listings_price_unit;

-- Drop the functions and triggers
DROP TRIGGER IF EXISTS trigger_validate_price_unit ON listings;
DROP FUNCTION IF EXISTS validate_listing_price_unit();
DROP FUNCTION IF EXISTS validate_price_unit();
``` 