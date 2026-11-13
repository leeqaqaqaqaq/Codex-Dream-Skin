import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";
import { validateSafeCss } from "../windows/assets/safe-css-validator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const SOURCE_THEMES_ROOT = path.join(repoRoot, "custom-themes", "themes");
const STUDIO_OUT_ROOT = path.join(repoRoot, "custom-themes", "studio-v1");

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createFlatZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const rawCrc = crc32(data);
    const compressed = deflateRawSync(data);
    const useDeflate = compressed.length < data.length;
    const method = useDeflate ? 8 : 0;
    const payload = useDeflate ? compressed : data;

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x5421, 12);
    local.writeUInt32LE(rawCrc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x5421, 14);
    central.writeUInt32LE(rawCrc, 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    localParts.push(local, payload);
    centralParts.push(central);
    offset += local.length + payload.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

function buildSafeStudioCss(raw) {
  const isLight = raw.appearance === "light";
  const borderColor = raw.colors?.line || (isLight ? "rgba(35, 40, 27, 0.22)" : "rgba(255, 255, 255, 0.16)");
  const blurLevel = isLight ? "blur(18px) saturate(1.14)" : "blur(20px) saturate(1.18)";
  const panelShadow = isLight
    ? "0 14px 36px rgba(24, 30, 20, 0.14)"
    : "0 18px 42px rgba(0, 0, 0, 0.42)";
  const hoverShadow = isLight
    ? "0 16px 38px rgba(24, 30, 20, 0.20)"
    : "0 18px 44px rgba(0, 0, 0, 0.50)";

  return [
    `[data-ds-part="root"] {`,
    `  background-color: var(--ds-theme-color-background);`,
    `  color: var(--ds-theme-color-text);`,
    `}`,
    ``,
    `[data-ds-part="sidebar"] {`,
    `  background-color: var(--ds-theme-color-panel);`,
    `  border-right-color: var(--ds-theme-color-line);`,
    `  border-right-width: 1px;`,
    `  border-right-style: solid;`,
    `  backdrop-filter: ${blurLevel};`,
    `}`,
    ``,
    `[data-ds-part="header"] {`,
    `  background-color: var(--ds-theme-color-panel);`,
    `  border-bottom-color: var(--ds-theme-color-line);`,
    `  border-bottom-width: 1px;`,
    `  border-bottom-style: solid;`,
    `  backdrop-filter: ${blurLevel};`,
    `}`,
    ``,
    `[data-ds-part="home-hero"] {`,
    `  color: var(--ds-theme-color-text);`,
    `}`,
    ``,
    `[data-ds-part="project-list"] {`,
    `  background-color: var(--ds-theme-color-panel);`,
    `  border-color: ${borderColor};`,
    `  border-width: 1px;`,
    `  border-style: solid;`,
    `  border-radius: 14px;`,
    `  backdrop-filter: ${blurLevel};`,
    `}`,
    ``,
    `[data-ds-part="project-list"]:hover {`,
    `  border-color: var(--ds-theme-color-accent);`,
    `}`,
    ``,
    `[data-ds-part="thread"] {`,
    `  gap: 12px;`,
    `}`,
    ``,
    `[data-ds-part="message"] {`,
    `  background-color: var(--ds-theme-color-panel);`,
    `  border-color: var(--ds-theme-color-line);`,
    `  border-width: 1px;`,
    `  border-style: solid;`,
    `  border-radius: 14px;`,
    `  backdrop-filter: ${blurLevel};`,
    `  box-shadow: ${panelShadow};`,
    `}`,
    ``,
    `[data-ds-part="composer"] {`,
    `  background-color: var(--ds-theme-color-panel);`,
    `  border-color: var(--ds-theme-color-line);`,
    `  border-width: 1px;`,
    `  border-style: solid;`,
    `  border-radius: 18px;`,
    `  backdrop-filter: ${blurLevel};`,
    `  box-shadow: ${panelShadow};`,
    `  transition-property: border-color, box-shadow;`,
    `  transition-duration: 180ms;`,
    `}`,
    ``,
    `[data-ds-part="composer"]:hover {`,
    `  border-color: var(--ds-theme-color-accent);`,
    `  box-shadow: ${hoverShadow};`,
    `}`,
    ``,
    `[data-ds-part="composer"]:focus-visible {`,
    `  border-color: var(--ds-theme-color-accent);`,
    `  box-shadow: ${hoverShadow};`,
    `}`,
    ``,
    `[data-ds-part="composer-toolbar"] {`,
    `  color: var(--ds-theme-color-muted);`,
    `}`,
    ``,
    `[data-ds-part="dialog"] {`,
    `  background-color: var(--ds-theme-color-panel-alt);`,
    `  border-color: var(--ds-theme-color-line);`,
    `  border-width: 1px;`,
    `  border-style: solid;`,
    `  border-radius: 16px;`,
    `  box-shadow: ${panelShadow};`,
    `}`,
    ``,
  ].join("\n");
}

function buildStudioThemeJson(raw, backgroundFile) {
  const art = raw.art && typeof raw.art === "object"
    ? {
        focusX: typeof raw.art.focusX === "number" ? raw.art.focusX : 0.5,
        focusY: typeof raw.art.focusY === "number" ? raw.art.focusY : 0.45,
        safeArea: raw.art.safeArea || "left",
        taskMode: raw.art.taskMode || "ambient",
      }
    : { focusX: 0.5, focusY: 0.45, safeArea: "left", taskMode: "ambient" };

  return {
    schemaVersion: 1,
    id: raw.id,
    name: raw.name,
    appearance: raw.appearance || "auto",
    image: backgroundFile,
    art,
    colors: { ...raw.colors },
  };
}

export async function exportStudioV1() {
  await fs.mkdir(STUDIO_OUT_ROOT, { recursive: true });
  const entries = await fs.readdir(SOURCE_THEMES_ROOT, { withFileTypes: true });
  const exported = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const srcDir = path.join(SOURCE_THEMES_ROOT, entry.name);
    const raw = JSON.parse(await fs.readFile(path.join(srcDir, "theme.json"), "utf8"));
    const ext = path.extname(raw.image).toLowerCase();
    const backgroundFile = `background${ext}`;

    const outDir = path.join(STUDIO_OUT_ROOT, raw.id);
    await fs.mkdir(outDir, { recursive: true });

    const studioTheme = buildStudioThemeJson(raw, backgroundFile);
    const studioCss = buildSafeStudioCss(raw);
    validateSafeCss(studioCss);

    const imageBytes = await fs.readFile(path.join(srcDir, raw.image));
    const themeJsonBytes = Buffer.from(JSON.stringify(studioTheme, null, 2) + "\n", "utf8");
    const themeCssBytes = Buffer.from(studioCss, "utf8");

    await fs.writeFile(path.join(outDir, "theme.json"), themeJsonBytes);
    await fs.writeFile(path.join(outDir, "theme.css"), themeCssBytes);
    await fs.writeFile(path.join(outDir, backgroundFile), imageBytes);

    const zipBytes = createFlatZipBuffer([
      { name: "theme.json", data: themeJsonBytes },
      { name: backgroundFile, data: imageBytes },
      { name: "theme.css", data: themeCssBytes },
    ]);
    const zipPath = path.join(STUDIO_OUT_ROOT, `${raw.id}.zip`);
    await fs.writeFile(zipPath, zipBytes);

    exported.push({ id: raw.id, outDir, zipPath, backgroundFile });
  }
  return exported;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const results = await exportStudioV1();
  for (const item of results) {
    console.log(`Exported ${item.id} -> ${path.relative(repoRoot, item.outDir)} & ${path.relative(repoRoot, item.zipPath)}`);
  }
}
