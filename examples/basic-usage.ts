import { ElevationService } from '../src/ElevationService';

// Basic example showing how to use the ElevationService
async function main() {
    // Create a new ElevationService instance
    const elevationService = new ElevationService({
        ttl: 3600 // Cache tiles for 1 hour
    });

    console.log('Fetching elevation data...\n');

    // Example 1: Single location
    const newYork = [{ lat: 40.7128, lon: -74.0060 }];
    const nycElevation = await elevationService.fetchElevationsAsync(newYork);
    console.log(`New York City elevation: ${nycElevation[0]?.toFixed(2)} meters`);

    // Example 2: Multiple locations
    const locations = [
        { lat: 40.7128, lon: -74.0060 },  // New York
        { lat: 34.0522, lon: -118.2437 }, // Los Angeles
        { lat: 51.5074, lon: -0.1278 },   // London
        { lat: 35.6762, lon: 139.6503 },  // Tokyo
    ];

    const elevations = await elevationService.fetchElevationsAsync(locations);

    console.log('\nBatch elevation results:');
    locations.forEach((loc, index) => {
        const elevation = elevations[index];
        console.log(`  ${loc.lat.toFixed(4)}, ${loc.lon.toFixed(4)}: ${elevation?.toFixed(2)} meters`);
    });

    // Example 3: Cache statistics
    const stats = elevationService.getCacheStats();
    console.log('\nCache statistics:', stats);

    // Clean up
    elevationService.clearCache();
}

main().catch(console.error);

