import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

// Server-side only configuration for Next.js API routes
// This should only be used in API routes and server components

interface ServerConfig {
  apiEndpoint: string;
  apiKey: string;
  region: string;
  s3BucketName: string;
  dynamoDbTable: string;
}

let serverConfig: ServerConfig | null = null;

async function loadServerConfig(): Promise<ServerConfig> {
  // Check if running in ECS with Secrets Manager
  const apiKeySecretName = process.env.API_KEY_SECRET_NAME;
  const configSecretName = process.env.CONFIG_SECRET_NAME;

  if (apiKeySecretName && configSecretName) {
    // Running in ECS - fetch from Secrets Manager
    const client = new SecretsManagerClient({
      region: process.env.AWS_REGION || "ap-southeast-1",
    });

    try {
      // Fetch API key secret
      const apiKeyCommand = new GetSecretValueCommand({
        SecretId: apiKeySecretName,
      });
      const apiKeyResponse = await client.send(apiKeyCommand);
      const apiKeySecret = JSON.parse(apiKeyResponse.SecretString || "{}");

      // Fetch config secret
      const configCommand = new GetSecretValueCommand({
        SecretId: configSecretName,
      });
      const configResponse = await client.send(configCommand);
      const configSecret = JSON.parse(configResponse.SecretString || "{}");

      return {
        apiEndpoint: configSecret.API_ENDPOINT,
        apiKey: apiKeySecret.api_key,
        region: configSecret.REGION,
        s3BucketName: configSecret.S3_BUCKET_NAME,
        dynamoDbTable: configSecret.DYNAMODB_TABLE,
      };
    } catch (error) {
      console.error("Failed to load secrets from AWS Secrets Manager:", error);
      throw new Error("Failed to initialize configuration from Secrets Manager");
    }
  } else {
    // Running locally - use environment variables
    return {
      apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || "",
      apiKey: process.env.NEXT_PUBLIC_API_KEY || "",
      region: process.env.NEXT_PUBLIC_REGION || "ap-southeast-1",
      s3BucketName: process.env.NEXT_PUBLIC_S3_BUCKET_NAME || "",
      dynamoDbTable: process.env.NEXT_PUBLIC_DYNAMODB_TABLE || "",
    };
  }
}

export async function getServerConfig(): Promise<ServerConfig> {
  if (!serverConfig) {
    serverConfig = await loadServerConfig();
  }
  return serverConfig;
}