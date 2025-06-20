# Transaction API

This directory contains the Transaction API service for the Aqua GenAI Resource project. The service is implemented in Go and provides endpoints for managing and processing transaction data.

## Features
- RESTful API for transaction management
- Integration with DynamoDB for persistent storage
- Dockerized for easy deployment
- Includes test scripts and payload samples

## Directory Structure
- `main.go` - Main entry point for the Transaction API service
- `design.md` - API design documentation
- `deploy.sh` - Deployment script
- `Dockerfile` - Docker configuration for the service
- `go.mod`, `go.sum` - Go module dependencies
- `test_payload.json` - Sample payload for testing
- `test_transaction_api.sh` - Shell script for API testing

## Getting Started

### Prerequisites
- Go 1.18+
- Docker (optional, for containerized deployment)
- AWS CLI (for DynamoDB integration)

### Installation
1. Clone the repository.
2. Navigate to the `api/transaction` directory.
3. Install dependencies:
   ```bash
   go mod tidy
   ```

### Running Locally
```bash
go run main.go
```

### Running with Docker
```bash
docker build -t transaction-api .
docker run -p 8080:8080 transaction-api
```

### Testing
- Use `test_transaction_api.sh` to run API tests.
- Use `test_payload.json` as a sample request body.

### Deployment
- Use `deploy.sh` for deployment automation.

## Environment Variables
- Configure AWS credentials and region for DynamoDB access.

## License
MIT License
