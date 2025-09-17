# Ground Elevation API

A simple Express server that provides ground elevation data using the `ElevationService` class. The service fetches elevation data from AWS elevation tiles and can optionally cache them in S3.

## Features

-   **Single Location Elevation**: Get elevation for a specific latitude/longitude
-   **Batch Elevation**: Get elevations for multiple locations at once
-   **Caching**: Built-in caching with configurable TTL (default: 1 hour)
-   **S3 Integration**: Optional S3 storage for elevation tiles
-   **Health Monitoring**: Health check and cache statistics endpoints

## Installation

```bash
npm install
```

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

The server will start on port 3000 (or the port specified in the `PORT` environment variable).

## API Endpoints

### 1. Root Endpoint

-   **GET** `/` - API information and available endpoints

### 2. Health Check

-   **GET** `/health` - Server health status

### 3. Single Location Elevation

-   **GET** `/elevation?lat={latitude}&lng={longitude}`

Example:

```bash
curl "http://localhost:3000/elevation?lat=40.7128&lng=-74.0060"
```

Response:

```json
{
    "elevation": 10,
    "location": {
        "lat": 40.7128,
        "lng": -74.006
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 4. Batch Elevation

-   **POST** `/elevation/batch`

Request body:

```json
{
    "locations": [
        { "lat": 40.7128, "lon": -74.006 },
        { "lat": 34.0522, "lon": -118.2437 }
    ]
}
```

Response:

```json
{
    "results": [
        {
            "elevation": 10,
            "location": { "lat": 40.7128, "lng": -74.006 },
            "timestamp": "2024-01-15T10:30:00.000Z"
        },
        {
            "elevation": 93,
            "location": { "lat": 34.0522, "lng": -118.2437 },
            "timestamp": "2024-01-15T10:30:00.000Z"
        }
    ],
    "total": 2,
    "successful": 2
}
```

### 5. Cache Management

-   **GET** `/cache/stats` - Get cache statistics
-   **POST** `/cache/clear` - Clear the cache

## Configuration

The `ElevationService` can be configured with S3 storage and custom TTL:

```typescript
const elevationService = new ElevationService({
    s3Storage: {
        endpoint: "your-s3-endpoint",
        region: "your-region",
        bucket: "your-bucket",
        accessKeyId: "your-access-key",
        secretAccessKey: "your-secret-key",
    },
    ttl: 7200, // 2 hours cache TTL
});
```

## Data Sources

The service fetches elevation data from:

-   **Primary**: AWS elevation tiles (`https://elevation-tiles-prod.s3.amazonaws.com/skadi/`)
-   **Optional**: Custom S3 storage for caching and persistence

## Error Handling

-   Invalid coordinates return 400 Bad Request
-   Failed elevation fetches return 500 Internal Server Error
-   Missing parameters return appropriate error messages

## Dependencies

-   `express` - Web framework
-   `axios` - HTTP client for fetching elevation tiles
-   `@aws-sdk/client-s3` - AWS S3 client (optional)
-   `typescript` - TypeScript compiler
-   `ts-node` - TypeScript execution engine (dev)

## License

LGPL-2.1-or-later
