#### Get Elevation Data

Elevation data from [https://elevation-tiles-prod.s3.amazonaws.com/skadi](https://elevation-tiles-prod.s3.amazonaws.com/skadi)

Very simple to use library.

```bash
npm install --save gnd-elev
```

```ts
import { fetchElevationsAsync, LocationData, TileMapDict } from "gnd-evel";

// make this global for reusability
const tilesCache: TileMapDict = {};

const fixes: LocationData[] = [
  { lat: 42.046, lon: 0.746283 },
  { lat: 42.046, lon: 0.746283 },
  { lat: 42.045983, lon: 0.74625 },
  { lat: 42.045966, lon: 0.7462 },
  { lat: 42.045916, lon: 0.746133 },
  { lat: 42.045866, lon: 0.74605 },
  { lat: 42.045816, lon: 0.745966 },
  { lat: 42.045733, lon: 0.745883 },
  { lat: 42.045616, lon: 0.74585 },
  { lat: 42.045483, lon: 0.745816 },
  { lat: 42.045366, lon: 0.745799 },
  { lat: 42.04525, lon: 0.745783 },
  { lat: 42.045116, lon: 0.745783 },
  { lat: 42.045, lon: 0.745799 },
  { lat: 42.044883, lon: 0.745866 },
  { lat: 42.044766, lon: 0.745916 },
  { lat: 42.044666, lon: 0.746033 },
  { lat: 42.044583, lon: 0.746166 },
  { lat: 42.0445, lon: 0.74635 },
];

(async () => {
  const gndElevations = await fetchElevationsAsync(tilesCache, fixes);
  // Order matters, do stuff with it.
})();
```
