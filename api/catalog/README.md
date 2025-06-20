# Catalog API

A Go-based AWS Lambda function that provides catalog discovery for S3 dataset buckets.

## Features

- **Categories Discovery**: List all product categories with counts
- **Products Discovery**: List products within a specific category
- **Images Discovery**: List images for a specific product with presigned URLs
- **S3 Integration**: Direct integration with AWS S3 for dataset scanning
- **Presigned URLs**: Automatic generation of time-limited access URLs for images

## API Endpoints

### Get Categories
```
GET /api/catalog?type=categories
```

Returns all available product categories with product counts.

### Get Products in Category
```
GET /api/catalog?type=products&category=REF
```

Returns all products in the specified category (REF, WM, TV, OTHER).

### Get Images for Product
```
GET /api/catalog?type=images&category=REF&productId=PRODUCT_ID
```

Returns all images for the specified product with presigned URLs.

## Environment Variables

- `AWS_DATASET_BUCKET`: S3 bucket containing the dataset (required)
- `AWS_REGION`: AWS region (default: ap-southeast-1)
- `PRESIGNED_URL_EXPIRY`: Presigned URL expiry in minutes (default: 15)
- `LOG_LEVEL`: Log level (default: INFO)

## Dataset Structure

The API expects the following S3 bucket structure:

```
dataset/
├── REF/           # Refrigerators
│   ├── PRODUCT_1/
│   │   ├── TEM NL/        # Label images
│   │   ├── CHÍNH DIỆN/    # Overview images
│   │   └── HÌNH WEB/      # Web images
│   └── PRODUCT_2/
├── WM/            # Washing Machines
├── TV/            # Televisions
└── OTHER/         # Other products
```

## Development

### Build and Test Locally

```bash
# Install dependencies
go mod download
go mod tidy

# Build binary
go build -o bootstrap .

# Run tests (if any)
go test -v ./...

# Format code
go fmt ./...
```

### Docker Build

```bash
# Build Docker image
docker build -t catalog-api .

# Test Docker image locally
docker run --rm -e AWS_DATASET_BUCKET=your-bucket catalog-api
```

### Deployment

Use the provided deployment script:

```bash
# Full deployment (build, push to ECR, update Lambda)
./deploy.sh

# Build Docker image only
./deploy.sh build

# Push to ECR only
./deploy.sh push

# Update Lambda function only
./deploy.sh update

# Test deployed function
./deploy.sh test

# Show help
./deploy.sh help
```

## Response Format

All responses follow this structure:

```json
{
  "type": "categories|products|images",
  "data": [...],
  "metadata": {
    "totalCategories": 4,
    "scannedAt": "2024-01-01T00:00:00Z",
    "bucket": "your-dataset-bucket"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

## Architecture

- **Runtime**: AWS Lambda with Go 1.21
- **Container**: Alpine Linux with Go binary
- **AWS Services**: S3, Lambda, ECR
- **Deployment**: Docker container via ECR