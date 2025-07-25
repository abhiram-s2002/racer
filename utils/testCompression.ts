import { EnhancedImageService } from './enhancedImageService';

// ============================================================================
// COMPRESSION TESTING UTILITY
// ============================================================================

export class CompressionTester {
  /**
   * Test the enhanced compression service with various scenarios
   */
  static async runCompressionTests() {
    const testResults = {
      enhancedService: {
        passed: 0,
        failed: 0,
        errors: [] as string[]
      },
      marketplaceService: {
        passed: 0,
        failed: 0,
        errors: [] as string[]
      }
    };

    // Test 1: Basic compression
    try {
      const testUri = 'file://test-image.jpg'; // This would be a real test image
      
      const result = await EnhancedImageService.compressImage(testUri, {
        quality: 0.8,
        format: 'jpeg',
        maxWidth: 800,
        maxHeight: 600
      });

      if (result.success) {
        testResults.enhancedService.passed++;
      } else {
        testResults.enhancedService.failed++;
        testResults.enhancedService.errors.push(`Basic compression: ${result.error}`);
      }
    } catch (error) {
      testResults.enhancedService.failed++;
      testResults.enhancedService.errors.push(`Basic compression error: ${error}`);
    }

    // Test 2: Fallback compression
    try {
      const testUri = 'file://test-image.jpg';
      
      const result = await EnhancedImageService.compressImage(testUri, {
        quality: 0.1, // Very low quality to trigger fallback
        format: 'jpeg',
        maxWidth: 400,
        maxHeight: 300
      });

      if (result.success) {
        testResults.enhancedService.passed++;
      } else {
        testResults.enhancedService.failed++;
        testResults.enhancedService.errors.push(`Fallback compression: ${result.error}`);
      }
    } catch (error) {
      testResults.enhancedService.failed++;
      testResults.enhancedService.errors.push(`Fallback compression error: ${error}`);
    }

    // Test 3: Validation
    try {
      const testUri = 'file://test-image.jpg';
      
      const validation = await EnhancedImageService.validateImageBeforeCompression(testUri);
      
      if (validation.isValid) {
        testResults.enhancedService.passed++;
      } else {
        testResults.enhancedService.failed++;
        testResults.enhancedService.errors.push(`Validation: ${validation.errors.join(', ')}`);
      }
    } catch (error) {
      testResults.enhancedService.failed++;
      testResults.enhancedService.errors.push(`Validation error: ${error}`);
    }

    // Test 4: Compression statistics
    try {
      const testUri = 'file://test-image.jpg';
      
      const stats = await EnhancedImageService.getCompressionStats(testUri);
      
      testResults.enhancedService.passed++;
    } catch (error) {
      testResults.enhancedService.failed++;
      testResults.enhancedService.errors.push(`Statistics error: ${error}`);
    }

    // Test 5: Marketplace service integration
    try {
      const testUri = 'file://test-image.jpg';
      
      const processed = await EnhancedImageService.compressImage(testUri, {
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200
      });
      
      if (processed.success) {
        testResults.marketplaceService.passed++;
      } else {
        testResults.marketplaceService.failed++;
        testResults.marketplaceService.errors.push(`Integration failed: ${processed.error}`);
      }
    } catch (error) {
      testResults.marketplaceService.failed++;
      testResults.marketplaceService.errors.push(`Integration error: ${error}`);
    }

    return testResults;
  }

  /**
   * Test compression with different quality settings
   */
  static async testQualitySettings(imageUri: string) {
    const qualitySettings = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
    const results = [];

    for (const quality of qualitySettings) {
      try {
        
        const result = await EnhancedImageService.compressImage(imageUri, {
          quality,
          format: 'jpeg',
          maxWidth: 800,
          maxHeight: 600
        });

        if (result.success) {
          const compressionRatio = result.compressionRatio * 100;
          results.push({
            quality,
            success: true,
            size: result.size,
            compressionRatio: result.compressionRatio,
            attempts: result.attempts
          });
        } else {
          results.push({
            quality,
            success: false,
            error: result.error,
            attempts: result.attempts
          });
        }
      } catch (error) {
        results.push({
          quality,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          attempts: 0
        });
      }
    }

    return results;
  }

  /**
   * Test compression with different formats
   */
  static async testFormats(imageUri: string) {
    const formats = ['jpeg', 'png', 'webp'] as const;
    const results = [];

    for (const format of formats) {
      try {
        
        const result = await EnhancedImageService.compressImage(imageUri, {
          quality: 0.8,
          format,
          maxWidth: 800,
          maxHeight: 600
        });

        if (result.success) {
          const compressionRatio = result.compressionRatio * 100;
          results.push({
            format,
            success: true,
            size: result.size,
            compressionRatio: result.compressionRatio,
            attempts: result.attempts
          });
        } else {
          results.push({
            format,
            success: false,
            error: result.error,
            attempts: result.attempts
          });
        }
      } catch (error) {
        results.push({
          format,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          attempts: 0
        });
      }
    }

    return results;
  }

  /**
   * Generate a compression report
   */
  static async generateCompressionReport(imageUri: string) {
    const report = {
      imageUri,
      timestamp: new Date().toISOString(),
      originalStats: null as any,
      qualityTests: null as any,
      formatTests: null as any,
      recommendations: [] as string[]
    };

    try {
      // Get original image stats
      const originalValidation = await EnhancedImageService.validateImageBeforeCompression(imageUri);
      const originalStats = await EnhancedImageService.getCompressionStats(imageUri);
      
      report.originalStats = {
        isValid: originalValidation.isValid,
        size: originalStats.originalSize,
        recommendedQuality: originalStats.recommendedQuality,
        estimatedCompressedSize: originalStats.estimatedCompressedSize,
        compressionRatio: originalStats.compressionRatio,
        dimensions: {
          width: originalValidation.details.width,
          height: originalValidation.details.height
        }
      };

      // Test quality settings
      report.qualityTests = await this.testQualitySettings(imageUri);
      
      // Test formats
      report.formatTests = await this.testFormats(imageUri);

      // Generate recommendations
      if (!originalValidation.isValid) {
        report.recommendations.push('Image validation failed - check if image is corrupted');
      }

      const successfulQualities = report.qualityTests.filter((r: any) => r.success);
      if (successfulQualities.length === 0) {
        report.recommendations.push('All quality settings failed - image may be corrupted or unsupported');
      } else {
        const bestQuality = successfulQualities.reduce((best: any, current: any) => 
          current.compressionRatio < best.compressionRatio ? current : best
        );
        report.recommendations.push(`Best quality setting: ${bestQuality.quality} (${(bestQuality.compressionRatio * 100).toFixed(1)}% compression)`);
      }

      const successfulFormats = report.formatTests.filter((r: any) => r.success);
      if (successfulFormats.length === 0) {
        report.recommendations.push('All formats failed - check image format support');
      } else {
        const bestFormat = successfulFormats.reduce((best: any, current: any) => 
          current.compressionRatio < best.compressionRatio ? current : best
        );
        report.recommendations.push(`Best format: ${bestFormat.format.toUpperCase()} (${(bestFormat.compressionRatio * 100).toFixed(1)}% compression)`);
      }

    } catch (error) {
      console.error('❌ Error generating report:', error);
      report.recommendations.push(`Error generating report: ${error}`);
    }

    return report;
  }
} 