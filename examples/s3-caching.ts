import { ElevationService } from '../src/ElevationService';

// Example showing how to use S3 caching
async function main() {
    // Create ElevationService with S3 storage
    // Make sure to set your environment variables or replace with actual values
    const elevationService = new ElevationService({
        s3Storage: {
            endpoint: process.env.S3_ENDPOINT || 'https://s3.amazonaws.com',
            region: process.env.S3_REGION || 'us-east-1',
            bucket: process.env.S3_BUCKET || 'my-elevation-tiles',
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            forcePathStyle: false
        },
        ttl: 7200 // Cache tiles for 2 hours
    });

    console.log('Fetching elevation data with S3 caching enabled...\n');

    const locations = [
        { lat: 37.7749, lon: -122.4194 }, // San Francisco
        { lat: 41.8781, lon: -87.6298 },  // Chicago
    ];

    // First call will fetch from AWS and cache in S3
    console.log('First call (will cache to S3):');
    const start1 = Date.now();
    const elevations1 = await elevationService.fetchElevationsAsync(locations);
    const time1 = Date.now() - start1;
    console.log(`Elevations: ${elevations1.map(e => e?.toFixed(2)).join(', ')} meters`);
    console.log(`Time taken: ${time1}ms\n`);

    // Clear memory cache
    elevationService.clearCache();

    // Second call will fetch from S3 (faster)
    console.log('Second call (from S3 cache):');
    const start2 = Date.now();
    const elevations2 = await elevationService.fetchElevationsAsync(locations);
    const time2 = Date.now() - start2;
    console.log(`Elevations: ${elevations2.map(e => e?.toFixed(2)).join(', ')} meters`);
    console.log(`Time taken: ${time2}ms\n`);

    console.log(`Speed improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}% faster`);

    // Clean up
    elevationService.clearCache();
}

main().catch(console.error);

