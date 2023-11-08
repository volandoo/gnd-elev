import axios from "axios";
import { promisify } from "util";
const { gunzip } = require("zlib");

const SIZE = 3601;

export type LocationData = { lat: number; lon: number };
export type TileMapDict = { [path: string]: Buffer };

export const fetchElevations = async (
  tileMap: TileMapDict,
  data: LocationData[]
) => {
  const elevations = [];
  for (let i = 0; i < data.length; i++) {
    try {
      const elevation = await getElevation(tileMap, data[i].lat, data[i].lon);
      elevations.push(elevation);
    } catch (e) {
      console.error(e);
      elevations.push(-1);
    }
  }
  return elevations;
};

const fetchTile = async (tileMap: TileMapDict, lat: number, lon: number) => {
  const latFileName = `${lat < 0 ? "S" : "N"}${String(Math.abs(lat)).padStart(
    2,
    "0"
  )}`;
  const lngFileName = `${lon < 0 ? "W" : "E"}${String(Math.abs(lon)).padStart(
    3,
    "0"
  )}`;
  const fileName = `${latFileName}${lngFileName}.hgt.gz`;
  const path = `${latFileName}/${fileName}`;
  const existing = tileMap[path];
  if (existing) {
    return existing;
  }

  const resp = await axios.get(
    `https://elevation-tiles-prod.s3.amazonaws.com/skadi/${path}`,
    {
      responseType: "arraybuffer",
    }
  );
  const buffer = Buffer.from(await promisify(gunzip)(resp.data));
  tileMap[path] = buffer;

  return buffer;
};

const rowCol = (buffer: Buffer, row: number, col: number) => {
  const size = SIZE;
  const offset = ((size - row - 1) * size + col) * 2;
  return buffer.readInt16BE(offset);
};

function avg(v1: number, v2: number, f: number) {
  return v1 + (v2 - v1) * f;
}
const getElevation = async (
  tileMap: { [path: string]: Buffer },
  lat: number,
  lon: number
) => {
  const latTileBuffer = await fetchTile(
    tileMap,
    Math.floor(lat),
    Math.floor(lon)
  );

  const size = SIZE - 1;
  const ll = [lat, lon];
  const row = (ll[0] - Math.floor(lat)) * size;
  const col = (ll[1] - Math.floor(lon)) * size;

  const rowLow = Math.floor(row);
  const rowHi = rowLow + 1;
  const rowFrac = row - rowLow;
  const colLow = Math.floor(col);
  const colHi = colLow + 1;
  const colFrac = col - colLow;
  const v00 = rowCol(latTileBuffer, rowLow, colLow);
  const v10 = rowCol(latTileBuffer, rowLow, colHi);
  const v11 = rowCol(latTileBuffer, rowHi, colHi);
  const v01 = rowCol(latTileBuffer, rowHi, colLow);
  const v1 = avg(v00, v10, colFrac);
  const v2 = avg(v01, v11, colFrac);

  return avg(v1, v2, rowFrac);
};
