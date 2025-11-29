import express from 'express';
import { ElevationService, type LocationData } from '../src/ElevationService';

const app = express();
const PORT = process.env.PORT || 3030;

// Middleware
app.use(express.json());

// Initialize ElevationService
const elevationService = new ElevationService({});

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Ground Elevation API using ElevationService',
        endpoints: {
            '/elevation': 'GET - Get elevation for a specific location',
            '/elevation/batch': 'POST - Get elevations for multiple locations',
            '/health': 'GET - Health check endpoint',
            '/cache/stats': 'GET - Get cache statistics',
            '/cache/clear': 'POST - Clear cache'
        },
        usage: {
            single: '/elevation?lat=40.7128&lng=-74.0060',
            batch: 'POST /elevation/batch with body: { "locations": [{"lat": 40.7128, "lon": -74.0060}] }'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'ElevationService'
    });
});

// Get elevation data for a single location
app.get('/elevation', async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({
                error: 'Missing required parameters: lat and lng'
            });
        }

        const latitude = parseFloat(lat as string);
        const longitude = parseFloat(lng as string);

        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                error: 'Invalid coordinates provided'
            });
        }

        // Use ElevationService to get elevation
        const locationData: LocationData = { lat: latitude, lon: longitude };
        const elevations = await elevationService.fetchElevationsAsync([locationData]);
        const elevation = elevations[0];

        if (elevation === -1) {
            return res.status(500).json({
                error: 'Failed to fetch elevation data for the specified location'
            });
        }

        const groundData = {
            elevation,
            location: {
                lat: latitude,
                lng: longitude
            },
            timestamp: new Date().toISOString()
        };

        res.json(groundData);
    } catch (error) {
        console.error('Error fetching elevation data:', error);
        res.status(500).json({
            error: 'Failed to fetch elevation data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get elevation data for multiple locations
app.post('/elevation/batch', async (req, res) => {
    try {
        const { locations } = req.body;

        if (!locations || !Array.isArray(locations)) {
            return res.status(400).json({
                error: 'Missing or invalid locations array'
            });
        }

        if (locations.length === 0) {
            return res.status(400).json({
                error: 'Locations array cannot be empty'
            });
        }

        // Validate location format
        const validLocations: LocationData[] = [];
        for (const loc of locations) {
            if (typeof loc.lat === 'number' && typeof loc.lon === 'number' &&
                !isNaN(loc.lat) && !isNaN(loc.lon)) {
                validLocations.push(loc);
            } else {
                return res.status(400).json({
                    error: 'Invalid location format. Each location must have lat and lon as numbers.',
                    invalidLocation: loc
                });
            }
        }

        // Use ElevationService to get elevations
        const elevations = await elevationService.fetchElevationsAsync(validLocations);

        const results = validLocations.map((location, index) => ({
            elevation: elevations[index],
            location: {
                lat: location.lat,
                lng: location.lon
            },
            timestamp: new Date().toISOString()
        }));

        res.json({
            results,
            total: results.length,
            successful: results.filter(r => r.elevation !== -1).length
        });
    } catch (error) {
        console.error('Error fetching batch elevation data:', error);
        res.status(500).json({
            error: 'Failed to fetch batch elevation data',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Get cache statistics
app.get('/cache/stats', (req, res) => {
    try {
        const stats = elevationService.getCacheStats();
        res.json({
            cache: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error getting cache stats:', error);
        res.status(500).json({
            error: 'Failed to get cache statistics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Clear cache
app.post('/cache/clear', (req, res) => {
    try {
        elevationService.clearCache();
        res.json({
            message: 'Cache cleared successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({
            error: 'Failed to clear cache',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🌍 Single elevation: http://localhost:${PORT}/elevation?lat=40.7128&lng=-74.0060`);
    console.log(`📊 Cache stats: http://localhost:${PORT}/cache/stats`);
});

export default app;
