import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { gunzipSync } from 'zlib';

const SIZE = 3601;

export type LocationData = { lat: number; lon: number };

type TileMapDict = { [path: string]: Buffer };

export interface S3StorageConfig {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle?: boolean;
}

export interface ElevationOptions {
    s3Storage?: S3StorageConfig;
    ttl?: number; // TTL in seconds, defaults to 3600 (1 hour)
}

export class ElevationService {
    private tileMap: TileMapDict = {};
    private downloading: { [path: string]: boolean } = {};
    private tileTimeouts: { [path: string]: NodeJS.Timeout } = {};
    private s3Client: S3Client | null = null;
    private s3Bucket: string | null = null;
    private ttl: number;

    constructor(options: ElevationOptions = {}) {
        this.ttl = options.ttl || 3600; // Default to 1 hour

        if (options.s3Storage) {
            this.s3Client = new S3Client({
                endpoint: options.s3Storage.endpoint,
                region: options.s3Storage.region,
                credentials: {
                    accessKeyId: options.s3Storage.accessKeyId,
                    secretAccessKey: options.s3Storage.secretAccessKey,
                },
                forcePathStyle: options.s3Storage.forcePathStyle || false,
            });
            this.s3Bucket = options.s3Storage.bucket;
        }
    }

    /**
     * Fetch elevations for multiple locations asynchronously
     */
    async fetchElevationsAsync(data: LocationData[]): Promise<number[]> {
        const elevations: number[] = [];

        for (let i = 0; i < data.length; i++) {
            try {
                const elevation = await this.getElevationAsync(data[i]!.lat, data[i]!.lon);
                elevations.push(elevation);
            } catch (e) {
                console.error(e);
                elevations.push(Number.NEGATIVE_INFINITY);
            }
        }

        return elevations;
    }

    /**
     * Fetch elevations for multiple locations synchronously
     */
    fetchElevationsSync(data: LocationData[]): number[] {
        const elevations: number[] = [];

        for (let i = 0; i < data.length; i++) {
            try {
                const elevation = this.getElevationSync(data[i]!.lat, data[i]!.lon);
                elevations.push(elevation);
            } catch (e) {
                console.error(e);
                elevations.push(Number.NEGATIVE_INFINITY);
            }
        }

        return elevations;
    }

    /**
     * Get elevation for a single location asynchronously
     */
    private async getElevationAsync(lat: number, lon: number): Promise<number> {
        const buffer = await this.fetchTileBufferAsync(Math.floor(lat), Math.floor(lon));
        if (!buffer) return Number.NEGATIVE_INFINITY;
        return this.calculateElevation(buffer, lat, lon);
    }

    /**
     * Get elevation for a single location synchronously
     */
    private getElevationSync(lat: number, lon: number): number {
        const buffer = this.fetchTileBufferSync(Math.floor(lat), Math.floor(lon));
        if (!buffer) return Number.NEGATIVE_INFINITY;
        return this.calculateElevation(buffer, lat, lon);
    }

    /**
     * Fetch tile buffer synchronously
     */
    private fetchTileBufferSync(lat: number, lon: number): Buffer | null {
        const path = this.tileMapPath(lat, lon);
        const buffer = this.tileMap[path];

        if (buffer) {
            // Reset TTL when tile is accessed
            this.setTileTimeout(path);
            return buffer;
        }

        this.addToTileMap(path);
        return null;
    }

    /**
     * Fetch tile buffer asynchronously
     */
    private async fetchTileBufferAsync(lat: number, lon: number): Promise<Buffer | null> {
        const path = this.tileMapPath(lat, lon);
        const buffer = this.tileMap[path];

        if (buffer) {
            // Reset TTL when tile is accessed
            this.setTileTimeout(path);
            return buffer;
        }

        // Check S3 storage first if configured
        if (this.s3Client) {
            const exists = await this.checkTileInS3(path);
            if (exists) {
                const s3Buffer = await this.getTileFromS3(path);
                if (s3Buffer) {
                    const buffer = Buffer.from(gunzipSync(s3Buffer));
                    this.setTileTimeout(path);
                    this.tileMap[path] = buffer;
                    return buffer;
                }
            }
        }

        // addToTileMap will check S3 first, then fall back to AWS
        await this.addToTileMap(path);
        return this.tileMap[path] || null;
    }

    /**
     * Add tile to the tile map
     */
    private async addToTileMap(path: string): Promise<void> {
        if (this.downloading[path]) return;
        this.downloading[path] = true;

        // First, try to get the tile from S3 storage if configured
        if (this.s3Client) {
            const exists = await this.checkTileInS3(path);
            if (exists) {
                const s3Buffer = await this.getTileFromS3(path);
                if (s3Buffer) {
                    delete this.downloading[path];
                    this.tileMap[path] = s3Buffer;
                    this.setTileTimeout(path);
                    return;
                }
            }
        }

        // If not found in S3, fall back to AWS elevation tiles
        const resp = await fetch(`https://elevation-tiles-prod.s3.amazonaws.com/skadi/${path}`)
            .then(async response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.arrayBuffer();
                return { data };
            })
            .catch(e => {
                console.log(`Error fetching tile ${path} from AWS`);
                console.error(e);
                return null;
            });

        console.log(`Fetched tile ${path} from AWS`);
        delete this.downloading[path];
        if (!resp) {
            return;
        }

        const buffer = Buffer.from(gunzipSync(resp.data));
        // Store in memory with TTL
        this.tileMap[path] = buffer;
        this.setTileTimeout(path);

        // Upload to S3 storage if configured (for future use)
        if (this.s3Client) {
            await this.uploadTileToS3(path, Buffer.from(resp.data));
        }
    }

    /**
     * Generate tile map path from coordinates
     */
    private tileMapPath(lat: number, lon: number): string {
        const latFileName = `${lat < 0 ? 'S' : 'N'}${String(Math.abs(lat)).padStart(2, '0')}`;
        const lngFileName = `${lon < 0 ? 'W' : 'E'}${String(Math.abs(lon)).padStart(3, '0')}`;
        const fileName = `${latFileName}${lngFileName}.hgt.gz`;
        return `${latFileName}/${fileName}`;
    }

    /**
     * Set TTL timeout for a tile
     */
    private setTileTimeout(path: string): void {
        // Clear existing timeout if any
        if (this.tileTimeouts[path]) {
            clearTimeout(this.tileTimeouts[path]);
        }

        // Set new timeout to remove tile after TTL
        this.tileTimeouts[path] = setTimeout(() => {
            delete this.tileMap[path];
            delete this.tileTimeouts[path];
            console.log(`Tile ${path} timed out`);
        }, this.ttl * 1000);
    }

    /**
     * Check if tile exists in S3
     */
    private async checkTileInS3(path: string): Promise<boolean> {
        if (!this.s3Client) return false;

        try {
            await this.s3Client.send(
                new HeadObjectCommand({
                    Bucket: this.getS3Bucket(),
                    Key: path,
                }),
            );
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get tile from S3
     */
    private async getTileFromS3(path: string): Promise<Buffer | null> {
        if (!this.s3Client) return null;

        try {
            const response = await this.s3Client.send(
                new GetObjectCommand({
                    Bucket: this.getS3Bucket(),
                    Key: path,
                }),
            );

            if (response.Body) {
                const chunks: Buffer[] = [];
                for await (const chunk of response.Body as any) {
                    chunks.push(Buffer.from(chunk));
                }
                return Buffer.concat(chunks);
            }
            return null;
        } catch (error) {
            console.error(`Failed to get tile from S3: ${path}`, error);
            return null;
        }
    }

    /**
     * Upload tile to S3
     */
    private async uploadTileToS3(path: string, buffer: Buffer): Promise<void> {
        if (!this.s3Client) return;

        try {
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.getS3Bucket(),
                    Key: path,
                    Body: buffer,
                    ContentType: 'application/gzip',
                }),
            );
        } catch (error) {
            console.error(`Failed to upload tile to S3: ${path}`, error);
        }
        console.log(`Uploaded tile ${path} to S3`);
    }

    /**
     * Get S3 bucket from config
     */
    private getS3Bucket(): string {
        return this.s3Bucket || '';
    }

    /**
     * Calculate elevation from buffer using bilinear interpolation
     */
    private calculateElevation(buffer: Buffer, lat: number, lon: number): number {
        const size = SIZE - 1;
        const ll = [lat, lon] as [number, number];
        const row = (ll[0] - Math.floor(lat)) * size;
        const col = (ll[1] - Math.floor(lon)) * size;

        const rowLow = Math.floor(row);
        const rowHi = rowLow + 1;
        const rowFrac = row - rowLow;
        const colLow = Math.floor(col);
        const colHi = colLow + 1;
        const colFrac = col - colLow;

        const v00 = this.rowCol(buffer, rowLow, colLow);
        const v10 = this.rowCol(buffer, rowLow, colHi);
        const v11 = this.rowCol(buffer, rowHi, colHi);
        const v01 = this.rowCol(buffer, rowHi, colLow);

        const v1 = this.avg(v00, v10, colFrac);
        const v2 = this.avg(v01, v11, colFrac);

        return this.avg(v1, v2, rowFrac);
    }

    /**
     * Get value from buffer at specific row/column
     */
    private rowCol(buffer: Buffer, row: number, col: number): number {
        const size = SIZE;
        const offset = ((size - row - 1) * size + col) * 2;
        return buffer.readInt16BE(offset);
    }

    /**
     * Calculate weighted average
     */
    private avg(v1: number, v2: number, f: number): number {
        return v1 + (v2 - v1) * f;
    }

    /**
     * Clear all tiles and timeouts (useful for cleanup)
     */
    public clearCache(): void {
        // Clear all timeouts
        Object.values(this.tileTimeouts).forEach(timeout => clearTimeout(timeout));

        // Clear data structures
        this.tileMap = {};
        this.downloading = {};
        this.tileTimeouts = {};
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): {
        tiles: number;
        downloading: number;
        timeouts: number;
    } {
        return {
            tiles: Object.keys(this.tileMap).length,
            downloading: Object.keys(this.downloading).length,
            timeouts: Object.keys(this.tileTimeouts).length,
        };
    }
}
