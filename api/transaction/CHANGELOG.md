# Changelog

All notable changes to the Transaction API will be documented in this file.

## [Unreleased]

## [1.1.1] - 2025-06-23
### Fixed
- **S3 Presigned URL Generation** - Fixed 403 Forbidden errors when loading images from S3
  - **Root Cause**: Manual v4 signing implementation was causing URL encoding and signature issues
  - **Solution**: Replaced manual signing with standard AWS SDK `PresignGetObject()` method
  - **Result**: Presigned URLs now work correctly, matching the proven catalog API implementation

### Changed
- **Presigned URL Generation Method** - Reverted to AWS SDK standard approach
  - Replaced manual v4 signer with `presignClient.PresignGetObject()`
  - Removed complex HTTP request building and URL encoding logic
  - Simplified implementation to match working catalog API
  - Cleaned up unused imports and variables

### Technical Details
- Updated `generatePresignedURL()` function to use `presignClient.PresignGetObject()`
- Removed manual URL construction and encoding that was causing issues
- Eliminated unused imports: `net/http`, `net/url`, `aws/signer/v4`
- Removed unused `awsConfig` global variable
- Now uses identical approach as catalog API for consistency

### Files Modified
- `main.go` - Simplified `generatePresignedURL()` function to use AWS SDK standard method

## [1.1.0] - 2025-06-23
### Fixed
- **Presigned S3 URL 403 Forbidden Error** - Resolved critical issue with presigned URL generation
  - **Root Cause**: AWS SDK v2 `PresignClient.PresignGetObject()` adds `amz-sdk-request` header that causes signature validation failures
  - **Solution**: Implemented manual AWS v4 signer to avoid problematic SDK headers
  - **Frontend Fix**: Updated SafeImage component to bypass Next.js image optimization for S3 URLs using `unoptimized` prop

### Added
- **Manual v4 Signer Implementation** - Custom presigned URL generation for reliable S3 access
  - Direct URL construction: `https://{bucket}.s3.{region}.amazonaws.com/{encodedKey}`
  - Proper URL encoding for S3 keys with special characters
  - Enhanced error handling and logging for presigned URL operations
  - Global AWS config storage for credential access

- **Enhanced Frontend Image Handling** - Improved S3 image loading in React components
  - Updated SafeImage component to detect all S3 URLs (not just presigned ones)
  - Added automatic bypass of Next.js image optimization for S3 URLs
  - Simplified detection logic for better reliability

- **Comprehensive Testing** - Added test script for presigned URL validation
  - `test_presigned_url.sh` - Validates API response and URL accessibility
  - Direct URL testing without Next.js interference
  - HTTP status code verification and error reporting

### Changed
- **Presigned URL Generation Method** - Replaced SDK method with manual v4 signer
- **Frontend Image Component** - Enhanced SafeImage to handle S3 URLs properly
- **Error Handling** - Improved logging and error messages for debugging

### Technical Details
- Replaced `presignClient.PresignGetObject()` with `v4.NewSigner().PresignHTTP()`
- Added `url.PathEscape()` for proper S3 key encoding
- Updated SafeImage component detection logic from `X-Amz-` specific to general S3 URL detection
- Added `unoptimized` prop to Next.js Image component for S3 URLs
- Enhanced credential retrieval and signature generation process

### Files Modified
- `main.go` - Updated `generatePresignedURL()` function with manual v4 signer
- `fe/src/components/details-modal.tsx` - Enhanced SafeImage component
- `test_presigned_url.sh` - Added comprehensive testing script
- `PRESIGNED_URL_FIX_SUMMARY.md` - Detailed documentation of the fix

### Added (Previous Release)
- **uploadedReferenceImageKey field support** - Enhanced transaction data model to include reference image key
  - Added `UploadedReferenceImageKey` field to `TransactionRecord` struct
  - Added `UploadedReferenceImageKey` field to `TransactionResponse` struct  
  - Enhanced `ImageAccessData` struct with `UploadedReferenceImage` field
  - Updated presigned URL generation to include reference images
  - Added logging for reference image URL generation

### Changed (Previous Release)
- **API Response Structure** - Transaction responses now include reference image access data
- **Image Access URLs** - Enhanced `generateImageAccessURLs()` function to handle reference images
- **Data Models** - Updated Go structs to support the new field with proper JSON/DynamoDB tags

## [1.0.0] - 2025-06-19
### Added
- Initial implementation of Transaction API in Go
- RESTful endpoints for transaction management
- DynamoDB integration for persistent storage
- Dockerfile for containerization
- Deployment and test scripts
- API design documentation
- Sample payload for testing
