package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type HealthResponse struct {
	Status    string            `json:"status"`
	Timestamp string            `json:"timestamp"`
	Version   string            `json:"version"`
	Service   string            `json:"service"`
	Region    string            `json:"region"`
	Environment map[string]string `json:"environment,omitempty"`
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	log.Printf("Health check request received: %+v", request)

	// Get environment variables
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "unknown"
	}

	deploymentEnv := os.Getenv("DEPLOYMENT_ENV")
	if deploymentEnv == "" {
		deploymentEnv = "unknown"
	}

	// Create health response
	healthResponse := HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Version:   "1.0.0",
		Service:   "aqua-genai-health-check",
		Region:    region,
		Environment: map[string]string{
			"deployment": deploymentEnv,
		},
	}

	// Marshal response to JSON
	responseBody, err := json.Marshal(healthResponse)
	if err != nil {
		log.Printf("Error marshaling health response: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers: map[string]string{
				"Content-Type":                 "application/json",
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
			},
			Body: `{"status":"error","message":"Internal server error"}`,
		}, nil
	}

	log.Printf("Health check response: %s", string(responseBody))

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent",
		},
		Body: string(responseBody),
	}, nil
}

func main() {
	lambda.Start(handler)
}
