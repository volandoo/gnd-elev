# Examples

This directory contains example implementations using the `gnd-elev` package.

## Available Examples

### 1. Basic Usage (`basic-usage.ts`)

Simple example showing basic elevation fetching for single and multiple locations.

```bash
bun run examples/basic-usage.ts
```

### 2. S3 Caching (`s3-caching.ts`)

Demonstrates how to use S3 storage for persistent tile caching.

```bash
# Set environment variables
export S3_ENDPOINT="https://s3.amazonaws.com"
export S3_REGION="us-east-1"
export S3_BUCKET="my-elevation-tiles"
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"

# Run the example
bun run examples/s3-caching.ts
```

### 3. Express Server (`server.ts`)

Full REST API server example with multiple endpoints.

```bash
# Install dependencies (including dev dependencies for express)
bun install

# Run the server example
bun run examples/server.ts
```

The server will start on port 3030 (or the port specified in the `PORT` environment variable).

#### API Endpoints

- **GET** `/` - API information
- **GET** `/health` - Health check
- **GET** `/elevation?lat={latitude}&lng={longitude}` - Get single location elevation
- **POST** `/elevation/batch` - Get multiple elevations (body: `{ "locations": [{"lat": 40.7128, "lon": -74.0060}] }`)
- **GET** `/cache/stats` - Cache statistics
- **POST** `/cache/clear` - Clear cache

#### Example Requests

```bash
# Single location
curl "http://localhost:3030/elevation?lat=40.7128&lng=-74.0060"

# Batch request
curl -X POST http://localhost:3030/elevation/batch \
  -H "Content-Type: application/json" \
  -d '{"locations": [{"lat": 40.7128, "lon": -74.0060}, {"lat": 34.0522, "lon": -118.2437}]}'
```

