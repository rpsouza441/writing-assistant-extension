import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const defaultPackageDir = resolve(repoRoot, "dist");

const forbiddenNames = new Set([".git", "node_modules"]);
const forbiddenExtensions = new Set([".env", ".pem", ".crx"]);

export function validatePackage(packageDir = defaultPackageDir) {
  const root = resolve(packageDir);
  const errors = [];
  const warnings = [];
  const manifestPath = join(root, "manifest.json");

  if (!existsSync(root)) {
    errors.push(`Package directory does not exist: ${root}`);
    return { ok: false, errors, warnings, manifest: null, root };
  }

  if (!existsSync(manifestPath)) {
    errors.push("manifest.json must exist at the package root.");
    return { ok: false, errors, warnings, manifest: null, root };
  }

  let manifest = null;

  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    errors.push(`manifest.json is not valid JSON: ${error.message}`);
    return { ok: false, errors, warnings, manifest: null, root };
  }

  if (manifest.manifest_version !== 3) {
    errors.push("manifest_version must be 3.");
  }

  if (!manifest.version) {
    errors.push("manifest.version is required.");
  }

  if (!manifest.name) {
    errors.push("manifest.name is required.");
  }

  if (!manifest.description) {
    errors.push("manifest.description is required.");
  }

  validateIcons(root, manifest, errors);
  validateReferencedFile(root, manifest.background?.service_worker, "background.service_worker", errors);
  validateReferencedFile(root, manifest.action?.default_popup, "action.default_popup", errors);
  validateReferencedFile(root, manifest.options_page, "options_page", errors);
  validateForbiddenFiles(root, root, errors);

  return { ok: errors.length === 0, errors, warnings, manifest, root };
}

function validateIcons(root, manifest, errors) {
  const icons = manifest.icons ?? {};
  const icon128 = icons["128"];

  if (!icon128) {
    errors.push("manifest.icons must include a 128px icon.");
  }

  for (const [size, iconPath] of Object.entries(icons)) {
    validateReferencedFile(root, iconPath, `icons.${size}`, errors);
  }
}

function validateReferencedFile(root, filePath, label, errors) {
  if (!filePath) {
    return;
  }

  const absolutePath = resolve(root, filePath);

  if (!absolutePath.startsWith(root)) {
    errors.push(`${label} points outside the package: ${filePath}`);
    return;
  }

  if (!existsSync(absolutePath)) {
    errors.push(`${label} file does not exist in package: ${filePath}`);
  }
}

function validateForbiddenFiles(root, currentDir, errors) {
  for (const item of readdirSync(currentDir, { withFileTypes: true })) {
    const absolutePath = join(currentDir, item.name);
    const relativePath = relative(root, absolutePath).split(sep).join("/");

    if (forbiddenNames.has(item.name)) {
      errors.push(`Forbidden directory found in package: ${relativePath}`);
      continue;
    }

    if (item.name === ".env" || item.name.startsWith(".env.") || forbiddenExtensions.has(extensionOrName(item.name))) {
      errors.push(`Forbidden file found in package: ${relativePath}`);
      continue;
    }

    if (item.isDirectory()) {
      validateForbiddenFiles(root, absolutePath, errors);
    }
  }
}

function extensionOrName(fileName) {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot === -1 ? fileName : fileName.slice(lastDot);
}

function printResult(result) {
  if (result.ok) {
    console.log(`Extension package check passed: ${result.root}`);
    console.log(`Manifest: ${result.manifest.name} ${result.manifest.version_name ?? result.manifest.version}`);
    return;
  }

  console.error(`Extension package check failed: ${result.root}`);

  for (const error of result.errors) {
    console.error(`- ${error}`);
  }

  process.exitCode = 1;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
const thisPath = resolve(fileURLToPath(import.meta.url));

if (invokedPath === thisPath) {
  printResult(validatePackage(process.argv[2] ?? defaultPackageDir));
}
