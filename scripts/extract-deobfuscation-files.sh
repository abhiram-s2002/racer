#!/bin/bash

# Script to extract deobfuscation files from Android build
# This script helps locate and copy deobfuscation files for Google Play Console upload

echo "🔍 Extracting deobfuscation files from Android build..."

# Check if we're in the right directory
if [ ! -d "android" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create output directory
OUTPUT_DIR="deobfuscation-files"
mkdir -p "$OUTPUT_DIR"

# Find mapping files
echo "📁 Looking for mapping files..."

# Look for mapping files in common build output locations
MAPPING_FILES=$(find android -name "mapping.txt" -type f 2>/dev/null)

if [ -z "$MAPPING_FILES" ]; then
    echo "⚠️  No mapping files found. Make sure you've built the release version with ProGuard enabled."
    echo "💡 Run: eas build --profile production --platform android"
    exit 1
fi

echo "✅ Found mapping files:"
echo "$MAPPING_FILES"

# Copy mapping files to output directory
for mapping_file in $MAPPING_FILES; do
    filename=$(basename "$mapping_file")
    echo "📋 Copying $filename to $OUTPUT_DIR/"
    cp "$mapping_file" "$OUTPUT_DIR/"
done

# Look for other deobfuscation files
echo "📁 Looking for other deobfuscation files..."

# R8/ProGuard output files
find android -name "*.mapping" -type f 2>/dev/null | while read -r file; do
    filename=$(basename "$file")
    echo "📋 Copying $filename to $OUTPUT_DIR/"
    cp "$file" "$OUTPUT_DIR/"
done

# Look for ProGuard output directories
find android -name "proguard" -type d 2>/dev/null | while read -r dir; do
    echo "📁 Found ProGuard output directory: $dir"
    if [ -f "$dir/mapping.txt" ]; then
        echo "📋 Copying mapping.txt from $dir"
        cp "$dir/mapping.txt" "$OUTPUT_DIR/mapping-$(basename $(dirname $dir)).txt"
    fi
done

echo ""
echo "✅ Deobfuscation files extracted to: $OUTPUT_DIR/"
echo ""
echo "📤 Upload these files to Google Play Console:"
echo "   1. Go to Google Play Console"
echo "   2. Select your app"
echo "   3. Go to Release > App bundle explorer"
echo "   4. Select your release"
echo "   5. Upload the mapping.txt file(s) in the 'Deobfuscation files' section"
echo ""
echo "🔧 Files in $OUTPUT_DIR/:"
ls -la "$OUTPUT_DIR/"

echo ""
echo "💡 Tip: Keep these files safe - you'll need them to analyze crash reports!"
