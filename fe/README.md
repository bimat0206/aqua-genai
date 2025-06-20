# React Frontend Application

This is the React frontend application for the Aqua GenAI project. It provides a user interface for interacting with the backend API services.

## Development

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Docker (for containerization)

### Local Development

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm start
```

The application will be available at http://localhost:3000.

## Building and Deploying

### Building the Docker Image

1. Build the Docker image locally:

```bash
docker build -t aqua-genai-react-frontend .
```

2. Test the Docker image locally:

```bash
docker run -p 80:80 aqua-genai-react-frontend
```

The application will be available at http://localhost.

### Deploying to AWS

1. Authenticate with AWS ECR:

```bash
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
```

2. Tag the Docker image:

```bash
docker tag aqua-genai-react-frontend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/aqua-genai-react-frontend-<suffix>:latest
```

3. Push the Docker image to ECR:

```bash
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/aqua-genai-react-frontend-<suffix>:latest
```

4. Deploy using Terraform:

```bash
cd ../infra
terraform apply
```

## Environment Variables

The following environment variables can be set to configure the application:

- `REACT_APP_API_ENDPOINT`: The URL of the backend API endpoint
- `REACT_APP_API_KEY`: The API key for accessing the backend API (if required)

## Project Structure

```
├── public/              # Static files
├── src/                 # Source code
│   ├── components/      # React components
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── utils/           # Utility functions
│   ├── App.js           # Main application component
│   └── index.js         # Entry point
├── nginx/               # Nginx configuration
│   └── nginx.conf       # Nginx configuration file
├── Dockerfile           # Docker configuration
└── package.json         # Project dependencies and scripts
```

## Continuous Integration/Continuous Deployment

The application is automatically built and deployed using AWS CodeBuild and AWS CodePipeline. The pipeline is triggered by commits to the main branch of the repository.

## Additional Resources

- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/index.html)
- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/index.html)