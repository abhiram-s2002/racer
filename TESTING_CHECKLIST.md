# 🧪 Marketplace Image Upload Testing Checklist

## 📋 Pre-Testing Setup

### ✅ Database Migration
- [ ] Run `test_database_migration.sql` in Supabase SQL Editor
- [ ] Verify new columns `thumbnail_images` and `preview_images` exist
- [ ] Confirm index `idx_listings_has_images` was created
- [ ] Test sample data insertion and cleanup

### ✅ Storage Buckets
- [ ] Verify `listings` bucket exists and is public
- [ ] Confirm bucket allows JPEG, PNG, WebP formats
- [ ] Check file size limit is 5MB
- [ ] Test bucket permissions

### ✅ Dependencies
- [ ] Confirm `expo-image-manipulator` is installed
- [ ] Confirm `expo-image-picker` is installed
- [ ] Verify all imports resolve correctly
- [ ] Check TypeScript compilation passes

---

## 🚀 Testing Steps

### **Step 1: Database Migration Test**
```sql
-- Run in Supabase SQL Editor
-- File: test_database_migration.sql
```

**Expected Results:**
- [ ] Columns added successfully
- [ ] Index created without errors
- [ ] Sample data inserted and retrieved
- [ ] Cleanup completed

### **Step 2: Component Integration Test**
1. Navigate to `/test-image-upload` in your app
2. Open the test screen

**Expected Results:**
- [ ] Test screen loads without errors
- [ ] All buttons are visible and functional
- [ ] No console errors in development

### **Step 3: Image Picking Test**
1. Click "Quick Test" button
2. Select 1-2 images from gallery
3. Observe test results

**Expected Results:**
- [ ] Image picker opens successfully
- [ ] Images are selected without errors
- [ ] Test results show "✅ Picked X images successfully"
- [ ] No permission errors

### **Step 4: Image Validation Test**
1. Run "Complete Test" with various image types
2. Test with different image sizes and formats

**Expected Results:**
- [ ] JPEG images validate successfully
- [ ] PNG images validate successfully
- [ ] Large images show warnings but pass
- [ ] Invalid formats are rejected
- [ ] File size limits are enforced

### **Step 5: Image Processing Test**
1. Run complete test suite
2. Check processing progress logs

**Expected Results:**
- [ ] Original images processed to 1200x1200px max
- [ ] Thumbnails created at 400x400px
- [ ] Previews created at 200x200px
- [ ] File sizes are reduced significantly
- [ ] Progress indicators work correctly

### **Step 6: Image Upload Test**
1. Monitor upload progress
2. Check Supabase storage

**Expected Results:**
- [ ] Images upload to `listings` bucket
- [ ] Three versions created per image (original, thumbnail, preview)
- [ ] Public URLs are generated
- [ ] Progress tracking works
- [ ] No upload failures

### **Step 7: Database Integration Test**
1. Check if listing is created in database
2. Verify image URLs are stored correctly

**Expected Results:**
- [ ] Listing appears in `listings` table
- [ ] `images` array contains original URLs
- [ ] `thumbnail_images` array contains thumbnail URLs
- [ ] `preview_images` array contains preview URLs
- [ ] All arrays have same length

### **Step 8: Real App Integration Test**
1. Go to Add Listing modal
2. Try uploading images through the normal flow
3. Create a listing with images

**Expected Results:**
- [ ] MarketplaceImagePicker opens correctly
- [ ] Images can be selected and uploaded
- [ ] Listing is created with image metadata
- [ ] Images display correctly in listing

---

## 🔍 Detailed Test Cases

### **Test Case 1: Single Image Upload**
- **Input**: 1 high-resolution JPEG image
- **Expected**: 3 versions created, all URLs accessible
- **Validation**: Check file sizes and dimensions

### **Test Case 2: Multiple Image Upload**
- **Input**: 3-5 images of different sizes
- **Expected**: All images processed and uploaded
- **Validation**: Verify primary image selection

### **Test Case 3: Large Image Handling**
- **Input**: Image > 5MB
- **Expected**: Compression applied, warning shown
- **Validation**: Final size < 5MB

### **Test Case 4: Invalid Format**
- **Input**: Non-image file (PDF, etc.)
- **Expected**: Validation error, upload blocked
- **Validation**: Error message displayed

### **Test Case 5: Network Issues**
- **Input**: Slow/poor connection
- **Expected**: Progress tracking, retry mechanism
- **Validation**: Upload completes or shows error

### **Test Case 6: Permission Denial**
- **Input**: Deny camera/gallery permissions
- **Expected**: Clear error message
- **Validation**: App doesn't crash

---

## 📊 Performance Benchmarks

### **Upload Speed**
- [ ] Single image: < 10 seconds
- [ ] Multiple images: < 30 seconds
- [ ] Large images: < 60 seconds

### **File Size Reduction**
- [ ] Original: 85% quality, max 1200px
- [ ] Thumbnail: 70% quality, max 400px
- [ ] Preview: 70% quality, max 200px

### **Memory Usage**
- [ ] No memory leaks during processing
- [ ] Temporary files cleaned up
- [ ] App remains responsive

---

## 🐛 Common Issues & Solutions

### **Issue: "Upload failed"**
- **Check**: Supabase storage permissions
- **Solution**: Verify bucket exists and is public

### **Issue: "Validation failed"**
- **Check**: Image format and size
- **Solution**: Ensure JPEG/PNG/WebP, < 5MB

### **Issue: "Permission required"**
- **Check**: Camera/gallery permissions
- **Solution**: Grant permissions in device settings

### **Issue: "Processing failed"**
- **Check**: expo-image-manipulator installation
- **Solution**: Reinstall package if needed

### **Issue: "Database error"**
- **Check**: Migration completed
- **Solution**: Run database migration SQL

---

## ✅ Success Criteria

### **Functional Requirements**
- [ ] Images can be picked from gallery
- [ ] Images can be captured with camera
- [ ] Multiple images can be selected
- [ ] Images are compressed and resized
- [ ] Images upload to Supabase storage
- [ ] Image URLs are saved to database
- [ ] Progress tracking works
- [ ] Error handling is robust

### **Performance Requirements**
- [ ] Upload completes within reasonable time
- [ ] File sizes are optimized
- [ ] Memory usage is efficient
- [ ] App remains responsive

### **User Experience Requirements**
- [ ] Clear progress indicators
- [ ] Helpful error messages
- [ ] Intuitive interface
- [ ] No crashes or freezes

---

## 📝 Test Results Template

```
Test Date: _______________
Tester: _________________

✅ Database Migration: [ ] Pass [ ] Fail
✅ Component Integration: [ ] Pass [ ] Fail
✅ Image Picking: [ ] Pass [ ] Fail
✅ Image Validation: [ ] Pass [ ] Fail
✅ Image Processing: [ ] Pass [ ] Fail
✅ Image Upload: [ ] Pass [ ] Fail
✅ Database Integration: [ ] Pass [ ] Fail
✅ Real App Integration: [ ] Pass [ ] Fail

Performance Results:
- Single Image Upload: _____ seconds
- Multiple Image Upload: _____ seconds
- File Size Reduction: _____%

Issues Found:
1. ________________________
2. ________________________
3. ________________________

Overall Status: [ ] Ready for Production [ ] Needs Fixes
```

---

## 🎯 Next Steps After Testing

1. **If All Tests Pass**: Deploy to production
2. **If Issues Found**: Fix and retest
3. **Performance Issues**: Optimize and benchmark
4. **User Feedback**: Gather and implement improvements

**Remember**: Test on both iOS and Android devices for complete coverage! 