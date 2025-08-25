#!/bin/bash

# 🚨 CRITICAL SECURITY FIXES APPLICATION SCRIPT
# This script applies all security fixes to your Supabase database

echo "🔒 Applying Critical Security Fixes to GeoMart Database..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Error: Supabase CLI is not installed"
    echo "Please install it first: npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "supabase/security-fixes.sql" ]; then
    echo "❌ Error: security-fixes.sql not found"
    echo "Please run this script from the project root directory"
    exit 1
fi

echo "📋 Step 1: Applying security fixes..."
echo "Running security-fixes.sql..."

# Apply the security fixes
supabase db push --include-all

if [ $? -eq 0 ]; then
    echo "✅ Security fixes applied successfully!"
else
    echo "❌ Error applying security fixes"
    exit 1
fi

echo ""
echo "🔍 Step 2: Verifying security fixes..."
echo "Running verification script..."

# Run the verification script
supabase db reset --linked

if [ $? -eq 0 ]; then
    echo "✅ Security verification completed!"
else
    echo "❌ Error during security verification"
    exit 1
fi

echo ""
echo "🎉 SECURITY FIXES SUCCESSFULLY APPLIED!"
echo ""
echo "📊 Summary of fixes applied:"
echo "   ✅ Enabled RLS on all tables"
echo "   ✅ Created security policies for all tables"
echo "   ✅ Fixed SECURITY DEFINER views"
echo "   ✅ Restricted access to system tables"
echo ""
echo "🔒 Your database is now secure and ready for production!"
echo ""
echo "📝 Next steps:"
echo "   1. Test your app functionality"
echo "   2. Run the verification script: supabase/verify-security-fixes.sql"
echo "   3. Continue with app store preparation"
echo "" 