// Client-side configuration manager
// Note: Secrets Manager integration is handled server-side

interface Config {
  apiEndpoint: string;
  apiKey: string;
  region: string;
  s3BucketName: string;
  dynamoDbTable: string;
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: Config | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // For client-side, always use environment variables
    // Secrets Manager is handled server-side and values are passed as env vars
    this.loadFromEnv();
    this.isInitialized = true;
  }


  private loadFromEnv(): void {
    this.config = {
      apiEndpoint: process.env.NEXT_PUBLIC_API_ENDPOINT || "",
      apiKey: process.env.NEXT_PUBLIC_API_KEY || "",
      region: process.env.NEXT_PUBLIC_REGION || "ap-southeast-1",
      s3BucketName: process.env.NEXT_PUBLIC_S3_BUCKET_NAME || "",
      dynamoDbTable: process.env.NEXT_PUBLIC_DYNAMODB_TABLE || "",
    };
  }

  getConfig(): Config {
    if (!this.config) {
      throw new Error("Configuration not initialized. Call initialize() first.");
    }
    return this.config;
  }

  // Individual getters for convenience
  getApiEndpoint(): string {
    return this.getConfig().apiEndpoint;
  }

  getApiKey(): string {
    return this.getConfig().apiKey;
  }

  getRegion(): string {
    return this.getConfig().region;
  }

  getS3BucketName(): string {
    return this.getConfig().s3BucketName;
  }

  getDynamoDbTable(): string {
    return this.getConfig().dynamoDbTable;
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();

// Export config type
export type { Config };