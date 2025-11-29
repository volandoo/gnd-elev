# gnd-elev

A TypeScript/JavaScript library for fetching ground elevation data using SRTM elevation tiles. Includes built-in caching with configurable TTL and optional S3 storage integration.

## Features

-   🌍 **High-precision elevation data** from SRTM/NASA elevation tiles
-   🚀 **Fast & efficient** with built-in memory caching
-   ☁️ **S3 Integration** for persistent tile caching
-   📦 **Batch processing** support for multiple locations
-   🔄 **Automatic tile management** with configurable TTL
-   📊 **Cache statistics** and management
-   🎯 **Bilinear interpolation** for accurate elevation values
-   🛠️ **TypeScript** first with full type definitions

## Installation

```bash
npm install gnd-elev
# or
yarn add gnd-elev
# or
bun add gnd-elev
```

## Usage

### Basic Usage

```typescript
import { ElevationService } from "gnd-elev";

// Create an instance
const elevationService = new ElevationService();

// Get elevation for a single location
const locations = [{ lat: 40.7128, lon: -74.006 }];
const elevations = await elevationService.fetchElevationsAsync(locations);
console.log(elevations[0]); // Elevation in meters
```

### With S3 Caching

```typescript
import { ElevationService } from "gnd-elev";

const elevationService = new ElevationService({
    s3Storage: {
        endpoint: "https://s3.amazonaws.com",
        region: "us-east-1",
        bucket: "my-elevation-tiles",
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        forcePathStyle: false,
    },
    ttl: 7200, // Cache tiles for 2 hours
});

const elevations = await elevationService.fetchElevationsAsync([
    { lat: 40.7128, lon: -74.006 },
    { lat: 34.0522, lon: -118.2437 },
]);
```

### Synchronous Usage

```typescript
import { ElevationService } from "gnd-elev";

const elevationService = new ElevationService();

// Note: This requires tiles to already be cached
const elevations = elevationService.fetchElevationsSync([{ lat: 40.7128, lon: -74.006 }]);
```

### Cache Management

```typescript
// Get cache statistics
const stats = elevationService.getCacheStats();
console.log(stats); // { tiles: 5, downloading: 0, timeouts: 5 }

// Clear cache manually
elevationService.clearCache();
```

## API Reference

### `ElevationService`

#### Constructor

```typescript
constructor(options?: ElevationOptions)
```

**Options:**

-   `s3Storage` (optional): S3 storage configuration for tile caching
    -   `endpoint`: S3 endpoint URL
    -   `region`: AWS region
    -   `bucket`: S3 bucket name
    -   `accessKeyId`: AWS access key ID
    -   `secretAccessKey`: AWS secret access key
    -   `forcePathStyle`: Force path-style URLs (default: `false`)
-   `ttl` (optional): Time-to-live for cached tiles in seconds (default: `3600`)

#### Methods

##### `fetchElevationsAsync(locations: LocationData[]): Promise<number[]>`

Fetch elevations for multiple locations asynchronously.

**Parameters:**

-   `locations`: Array of `{ lat: number, lon: number }` objects

**Returns:** Promise resolving to array of elevation values in meters

##### `fetchElevationsSync(locations: LocationData[]): number[]`

Fetch elevations for multiple locations synchronously (requires tiles to be cached).

**Parameters:**

-   `locations`: Array of `{ lat: number, lon: number }` objects

**Returns:** Array of elevation values in meters

##### `getCacheStats(): { tiles: number; downloading: number; timeouts: number }`

Get current cache statistics.

##### `clearCache(): void`

Clear all cached tiles and timeouts.

### Types

```typescript
type LocationData = {
    lat: number;
    lon: number;
};

interface S3StorageConfig {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle?: boolean;
}

interface ElevationOptions {
    s3Storage?: S3StorageConfig;
    ttl?: number;
}
```

## Data Sources

The service fetches elevation data from:

-   **Primary**: AWS SRTM elevation tiles (`elevation-tiles-prod.s3.amazonaws.com`)
-   **Optional**: Custom S3 storage for caching and faster access

## How It Works

1. When you request elevation for a location, the service determines which SRTM tile contains that location
2. If the tile is in memory cache, it's used immediately
3. If not cached, the service checks S3 storage (if configured)
4. If not in S3, it downloads from AWS public SRTM tiles
5. Downloaded tiles are cached in memory with TTL and optionally uploaded to S3
6. Bilinear interpolation is used to calculate precise elevation values

## Examples

See the [examples](./examples) directory for complete examples, including:

-   Express REST API server with elevation endpoints

## License

LGPL-2.1-or-later

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
