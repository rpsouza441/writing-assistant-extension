import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { deflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { validatePackage } from "./check-extension-package.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceDir = resolve(repoRoot, "dist");
const releasesDir = resolve(repoRoot, "releases");
const forbiddenNames = new Set([".git", "node_modules"]);
const forbiddenExtensions = new Set([".env", ".pem", ".crx", ".zip"]);
const crcTable = createCrcTable();

main();

function main() {
  const check = validatePackage(sourceDir);

  if (!check.ok) {
    console.error("Cannot create ZIP because the extension package is invalid.");

    for (const error of check.errors) {
      console.error(`- ${error}`);
    }

    process.exit(1);
  }

  mkdirSync(releasesDir, { recursive: true });

  const version = check.manifest.version;
  const zipName = `message-refiner-${version}.zip`;
  const zipPath = join(releasesDir, zipName);
  const entries = collectFiles(sourceDir);

  if (!entries.some((entry) => entry.name === "manifest.json")) {
    throw new Error("manifest.json must be at the root of the ZIP.");
  }

  writeFileSync(zipPath, createZip(entries));
  console.log(`Created Chrome Web Store ZIP: ${zipPath}`);
}

function collectFiles(rootDir) {
  if (!existsSync(rootDir)) {
    throw new Error(`Build directory does not exist: ${rootDir}`);
  }

  const files = [];
  walk(rootDir, rootDir, files);
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

function walk(rootDir, currentDir, files) {
  for (const item of readdirSync(currentDir, { withFileTypes: true })) {
    const absolutePath = join(currentDir, item.name);
    const relativePath = relative(rootDir, absolutePath).split(sep).join("/");

    if (forbiddenNames.has(item.name) || isForbiddenFile(item.name)) {
      continue;
    }

    if (item.isDirectory()) {
      walk(rootDir, absolutePath, files);
      continue;
    }

    if (!item.isFile()) {
      continue;
    }

    files.push({
      name: relativePath,
      data: readFileSync(absolutePath),
      mtime: statSync(absolutePath).mtime
    });
  }
}

function isForbiddenFile(fileName) {
  return fileName === ".env" || fileName.startsWith(".env.") || forbiddenExtensions.has(extensionOrName(fileName));
}

function extensionOrName(fileName) {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot === -1 ? fileName : fileName.slice(lastDot);
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const compressed = deflateRawSync(entry.data, { level: 9 });
    const crc = crc32(entry.data);
    const { time, date } = toDosDateTime(entry.mtime);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(date, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function toDosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());

  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  };
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable() {
  const table = new Uint32Array(256);

  for (let i = 0; i < 256; i += 1) {
    let crc = i;

    for (let j = 0; j < 8; j += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }

    table[i] = crc >>> 0;
  }

  return table;
}
