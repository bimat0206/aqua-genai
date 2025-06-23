# Changelog

All notable changes to the Aqua GenAI History API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0] - 2025-06-19

### Added
- **uploadedReferenceImageKey field support** - Enhanced history data model to include reference image key
  - Added `UploadedReferenceImageKey` field to `VerificationRecord` struct
  - Added `UploadedReferenceImageKey` field to `HistoryItem` struct
  - Updated DynamoDB attribute mapping to handle the new field
  - Enhanced data processing to include reference image information in responses

### Changed
- **API Response Structure** - History responses now include reference image key when available
- **Data Models** - Updated Go structs to support the new field with proper JSON/DynamoDB tags
- **Documentation** - Updated design documentation and README with new field examples

### Technical Details
- Modified `VerificationRecord` and `HistoryItem` structs in `main.go`
- Updated DynamoDB table structure documentation to include new attribute
- Added proper JSON marshaling tags for the new field
- Maintains backward compatibility - existing records without reference images work normally

### Files Modified
- `main.go` - Core API implementation and data structures
- `design.md` - Updated API documentation with new field examples
- `README.md` - Updated response examples to include new field

## [1.1.0] - 2025-06-18

### 🐛 Fixed
- **CRITICAL**: Fixed DynamoDB ExpressionAttributeNames validation error
  - Resolved `ValidationException: Value provided in ExpressionAttributeNames unused in expressions: keys: {#ts}`
  - Modified `buildFilterConditions()` to conditionally include attribute names only when used
  - Updated `queryVerificationRecords()` to only set `ExpressionAttributeNames` when needed
  - This fix prevents errors when filtering by `productId` or `category` without date filters

### 🔧 Technical Improvements
- Enhanced filter condition building logic for better DynamoDB query optimization
- Improved error handling for malformed filter expressions
- Added conditional expression attribute name management
- Optimized DynamoDB scan operations to reduce unnecessary attribute mappings

### 📝 Documentation
- Added comprehensive README.md with full API documentation
- Created detailed CHANGELOG.md for version tracking
- Updated code comments for better maintainability
- Added examples for all supported query combinations

### 🧪 Testing
- Verified fix with comprehensive test scenarios
- Tested all filter combinations (product, category, date, confidence)
- Validated proper DynamoDB expression generation
- Confirmed backward compatibility with existing queries

## [1.0.0] - 2025-06-17

### 🎉 Initial Release

### ✨ Features
- **History List View**: Paginated access to verification records
  - Support for pagination with configurable page sizes (1-100 records)
  - Advanced filtering by product ID, category, date range, and confidence scores
  - Sorting by timestamp (newest first)
  - Comprehensive metadata in responses

- **Analytics Summary View**: Statistical insights and performance metrics
  - Overall verification statistics (total count, success rate, average confidence)
  - Category-wise breakdown with individual success rates
  - AI model usage analytics with token consumption and cost tracking
  - Confidence distribution analysis (high/medium/low buckets)
  - Separate accuracy metrics for label and overview verifications

- **Data Export Functionality**: Export verification data in multiple formats
  - CSV export with all verification details
  - JSON export maintaining full data structure
  - Pre-signed S3 URLs for secure file downloads
  - Configurable export filters matching list view capabilities

### 🔍 Filtering Capabilities
- **Product Filtering**: Filter by specific product IDs
- **Category Filtering**: Filter by product categories (REF, WM, TV, OTHER)
- **Result Filtering**: Filter by verification results (CORRECT, INCORRECT, UNCERTAIN)
- **Date Range Filtering**: Custom date ranges with ISO 8601 format support
- **Confidence Filtering**: Minimum confidence thresholds for overall, label, and overview scores
- **AI Model Filtering**: Filter by specific AI models used for verification

### 🏗 Architecture
- **AWS Lambda**: Serverless function for scalable API hosting
- **DynamoDB Integration**: Optimized queries with proper error handling
- **S3 Integration**: Secure file export and pre-signed URL generation
- **API Gateway**: RESTful API with proper CORS and authentication support

### 🔒 Security
- API key authentication via `x-api-key` header
- CORS support for cross-origin requests
- Secure S3 pre-signed URLs for export downloads
- Input validation and sanitization

### 📊 Data Processing
- **Bedrock Response Parsing**: Intelligent parsing of AI model responses
  - JSON extraction from wrapped content
  - Confidence score normalization
  - Error handling for malformed responses
  - Support for multiple AI model response formats

- **Verification Result Logic**: Sophisticated result determination
  - Combined label and overview match analysis
  - Confidence-based result classification
  - Threshold-based categorization (CORRECT/INCORRECT/UNCERTAIN)

### 🚀 Performance
- Efficient DynamoDB scan operations with proper indexing
- Server-side pagination to minimize data transfer
- Optimized JSON serialization and response formatting
- Memory-efficient record processing for large datasets

### 🛠 Development Tools
- **Go 1.21**: Modern Go version with latest features
- **AWS SDK v2**: Latest AWS SDK for optimal performance
- **Docker Support**: Containerized deployment option
- **Comprehensive Testing**: Full test suite with integration tests

### 📦 Dependencies
- `github.com/aws/aws-lambda-go v1.44.0` - Lambda runtime
- `github.com/aws/aws-sdk-go-v2 v1.24.1` - AWS SDK core
- `github.com/aws/aws-sdk-go-v2/service/dynamodb v1.26.8` - DynamoDB client
- `github.com/aws/aws-sdk-go-v2/service/s3 v1.47.5` - S3 client
- `github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue v1.12.14` - DynamoDB marshaling

### 🌐 API Endpoints
- `GET /api/v1/history` - Main endpoint with view-based routing
- Support for `list`, `summary`, and `export` views
- Comprehensive query parameter support
- Standardized JSON response format

### 📋 Response Formats
- **Consistent Structure**: All responses follow the same base format
- **Rich Metadata**: Comprehensive metadata for debugging and monitoring
- **Pagination Support**: Full pagination information in list responses
- **Error Handling**: Standardized error response format

### 🔧 Configuration
- Environment variable-based configuration
- Support for multiple AWS regions
- Configurable logging levels
- Flexible table and bucket naming

---

## Version History Summary

| Version | Release Date | Key Changes |
|---------|--------------|-------------|
| 1.1.0   | 2025-06-18   | Fixed DynamoDB ExpressionAttributeNames validation error |
| 1.0.0   | 2025-06-17   | Initial release with full API functionality |

---

## Migration Guide

### From 1.0.0 to 1.1.0

This is a **backward-compatible** update that fixes a critical DynamoDB validation error. No changes are required to existing API calls or client implementations.

#### What Changed
- Internal DynamoDB query optimization
- Improved filter condition handling
- Enhanced error prevention for edge cases

#### What Stayed the Same
- All API endpoints and parameters
- Response formats and data structures
- Authentication and security mechanisms
- Performance characteristics

#### Recommended Actions
1. Update to version 1.1.0 to prevent DynamoDB validation errors
2. No client-side changes required
3. Monitor logs to confirm error resolution
4. Continue using existing query patterns

---

## Upcoming Features (Roadmap)

### Version 1.2.0 (Planned)
- **Enhanced Analytics**: Time-series analytics with trend analysis
- **Real-time Notifications**: WebSocket support for live updates
- **Advanced Filtering**: Full-text search capabilities
- **Performance Metrics**: Detailed performance monitoring and alerting

### Version 1.3.0 (Planned)
- **Batch Operations**: Bulk data processing capabilities
- **Data Archiving**: Automated data lifecycle management
- **Enhanced Security**: OAuth 2.0 and JWT token support
- **Multi-region Support**: Cross-region data replication

---

## Support and Maintenance

### Bug Reports
Please report bugs by creating an issue in the repository with:
- Version number
- Steps to reproduce
- Expected vs actual behavior
- Request/response examples
- Environment details

### Feature Requests
Feature requests are welcome! Please include:
- Use case description
- Proposed API changes
- Expected benefits
- Implementation considerations

### Security Issues
For security-related issues, please contact the development team directly rather than creating public issues.

---

**Maintained by**: Aqua GenAI Development Team  
**Repository**: [Internal Repository]  
**Documentation**: [API Documentation](README.md)  
**Support**: [Development Team Contact]