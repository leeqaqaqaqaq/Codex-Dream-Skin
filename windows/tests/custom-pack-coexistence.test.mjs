import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { loadTheme, loadPayload } from "../scripts/injector.mjs";
import { validateSafeCss } from "../assets/safe-css-validator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const customThemesRoot = path.join(repoRoot, "custom-themes", "themes");
const studioRoot = path.join(repoRoot, "custom-themes", "studio-v1");

function createMockDom({ pathname = "/", hash = "", appearance = "dark" } = {}) {
  const createdBlobs = new Map();
  const revokedBlobs = new Set();
  let blobSeq = 0;
  const elementsById = new Map();
  const listeners = new Map();

  class MockClassList {
    constructor(owner) {
      this.owner = owner;
      this.set = new Set();
    }
    add(...tokens) {
      for (const token of tokens) {
        if (token) this.set.add(String(token));
      }
    }
    remove(...tokens) {
      for (const token of tokens) this.set.delete(String(token));
    }
    contains(token) {
      return this.set.has(String(token));
    }
    [Symbol.iterator]() {
      return this.set[Symbol.iterator]();
    }
  }

  class MockStyle {
    constructor() {
      this.props = new Map();
    }
    _syncIndexedKeys() {
      for (const key of Object.keys(this)) {
        if (/^\d+$/.test(key)) delete this[key];
      }
      let idx = 0;
      for (const name of this.props.keys()) {
        this[idx] = name;
        idx += 1;
      }
    }
    get length() {
      return this.props.size;
    }
    setProperty(name, value) {
      this.props.set(String(name), String(value));
      this._syncIndexedKeys();
    }
    getPropertyValue(name) {
      return this.props.get(String(name)) ?? "";
    }
    removeProperty(name) {
      this.props.delete(String(name));
      this._syncIndexedKeys();
    }
    [Symbol.iterator]() {
      return this.props.keys();
    }
  }

  class MockElement {
    constructor(tagName) {
      this.tagName = String(tagName || "div").toUpperCase();
      this.nodeType = 1;
      this._id = "";
      this.classList = new MockClassList(this);
      this.style = new MockStyle();
      this._attrMap = new Map();
      const attrMap = this._attrMap;
      this.attributes = {
        get length() {
          return attrMap.size;
        },
        [Symbol.iterator]() {
          return Array.from(attrMap.entries(), ([name, value]) => ({ name, value }))[Symbol.iterator]();
        },
      };
      this.dataset = {};
      this.children = [];
      this.parentElement = null;
      this.textContent = "";
      this.value = "";
      this.eventListeners = new Map();
      this.focused = false;
    }
    get id() {
      return this._id;
    }
    set id(val) {
      if (this._id) elementsById.delete(this._id);
      this._id = String(val || "");
      if (this._id) elementsById.set(this._id, this);
    }
    get firstChild() {
      return this.children[0] || null;
    }
    get nextElementSibling() {
      if (!this.parentElement) return null;
      const idx = this.parentElement.children.indexOf(this);
      return idx >= 0 && idx + 1 < this.parentElement.children.length
        ? this.parentElement.children[idx + 1]
        : null;
    }
    setAttribute(name, value) {
      const k = String(name);
      const v = String(value);
      this._attrMap.set(k, v);
      if (k === "id") this.id = v;
      if (k === "class") {
        this.classList.set.clear();
        for (const cls of v.split(/\s+/).filter(Boolean)) this.classList.add(cls);
      }
      if (k.startsWith("data-")) {
        const camel = k.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
        this.dataset[camel] = v;
      }
    }
    hasAttribute(name) {
      if (name === "id") return Boolean(this._id);
      return this._attrMap.has(String(name));
    }
    getAttributeNames() {
      return [...this._attrMap.keys()];
    }
    getAttribute(name) {
      if (name === "id") return this._id || null;
      return this._attrMap.get(String(name)) ?? null;
    }
    removeAttribute(name) {
      const k = String(name);
      this._attrMap.delete(k);
      if (k.startsWith("data-")) {
        const camel = k.slice(5).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
        delete this.dataset[camel];
      }
    }
    appendChild(child) {
      if (child.parentElement) {
        child.parentElement.children = child.parentElement.children.filter((n) => n !== child);
      }
      child.parentElement = this;
      this.children.push(child);
      if (child._id) elementsById.set(child._id, child);
      return child;
    }
    insertBefore(child, ref) {
      if (!ref) return this.appendChild(child);
      if (child.parentElement) {
        child.parentElement.children = child.parentElement.children.filter((n) => n !== child);
      }
      const idx = this.children.indexOf(ref);
      child.parentElement = this;
      if (idx === -1) this.children.push(child);
      else this.children.splice(idx, 0, child);
      if (child._id) elementsById.set(child._id, child);
      return child;
    }
    remove() {
      const walk = (node) => {
        if (node._id) elementsById.delete(node._id);
        for (const c of node.children) walk(c);
      };
      walk(this);
      if (this.parentElement) {
        this.parentElement.children = this.parentElement.children.filter((n) => n !== this);
        this.parentElement = null;
      }
    }
    addEventListener(type, fn) {
      if (!this.eventListeners.has(type)) this.eventListeners.set(type, []);
      this.eventListeners.get(type).push(fn);
    }
    dispatchEvent(evt) {
      const list = this.eventListeners.get(evt?.type) || [];
      for (const fn of list) fn(evt);
    }
    click() {
      this.dispatchEvent({ type: "click", target: this });
    }
    focus() {
      this.focused = true;
    }
    closest(selector) {
      let cur = this;
      while (cur) {
        if (cur.matches(selector)) return cur;
        cur = cur.parentElement;
      }
      return null;
    }
    matches(selector) {
      return String(selector || "").split(",").some((p) => {
        const trimmed = p.trim();
        return trimmed ? matchesSimpleSelector(this, trimmed) : false;
      });
    }
    getBoundingClientRect() {
      if (this.tagName === "BODY" || this.tagName === "HTML" || this.tagName === "MAIN") {
        return { x: 0, y: 0, left: 0, top: 0, width: 1280, height: 800, right: 1280, bottom: 800 };
      }
      return { x: 16, y: 16, left: 16, top: 16, width: 480, height: 64, right: 496, bottom: 80 };
    }
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    }
    querySelectorAll(selector) {
      const parts = String(selector).split(",").map((s) => s.trim()).filter(Boolean);
      const out = [];
      const visit = (node) => {
        for (const child of node.children) {
          if (parts.some((p) => matchesSimpleSelector(child, p))) out.push(child);
          visit(child);
        }
      };
      visit(this);
      return out;
    }
  }

  function matchesSimpleSelector(el, sel) {
    const tokens = sel.trim().split(/\s+/);
    const leaf = tokens[tokens.length - 1];
    if (tokens.length > 1) {
      // Descendant check: leaf matches el and ancestor matches tokens[0]
      if (!matchesSingle(el, leaf)) return false;
      let ancestor = el.parentElement;
      const head = tokens.slice(0, -1).join(" ");
      while (ancestor) {
        if (matchesSimpleSelector(ancestor, head)) return true;
        ancestor = ancestor.parentElement;
      }
      return false;
    }
    return matchesSingle(el, leaf);
  }

  function matchesSingle(el, sel) {
    if (!sel) return false;
    if (sel.startsWith("#")) return el.id === sel.slice(1);
    if (sel.startsWith(".")) return el.classList.contains(sel.slice(1));
    if (sel.startsWith("[")) {
      const attrMatch = sel.match(/^\[([a-zA-Z0-9_-]+)([*^]?=)?(?:['"]([^'"]*)['"]|([^\]\s]+))?\]$/);
      if (!attrMatch) return false;
      const val = el.getAttribute(attrMatch[1]);
      if (val === null) return false;
      if (!attrMatch[2]) return true;
      const expected = attrMatch[3] ?? attrMatch[4] ?? "";
      if (attrMatch[2] === "=") return val === expected;
      if (attrMatch[2] === "*=") return val.includes(expected);
      if (attrMatch[2] === "^=") return val.startsWith(expected);
      return false;
    }
    const tagMatch = sel.match(/^([a-zA-Z0-9]+)/);
    return tagMatch ? el.tagName === tagMatch[1].toUpperCase() : false;
  }

  const documentElement = new MockElement("html");
  documentElement.setAttribute("data-theme", appearance);
  documentElement.setAttribute("data-ds-route", "home");
  const head = new MockElement("head");
  const body = new MockElement("body");
  documentElement.appendChild(head);
  documentElement.appendChild(body);

  const rootDiv = new MockElement("div");
  rootDiv.id = "root";
  const header = new MockElement("header");
  const menuBtn = new MockElement("button");
  menuBtn.setAttribute("aria-label", "Menu");
  header.appendChild(menuBtn);
  const main = new MockElement("main");
  const h1 = new MockElement("h1");
  h1.textContent = "What do you want to build?";
  const form = new MockElement("form");
  const textarea = new MockElement("textarea");
  form.appendChild(textarea);
  const utility = new MockElement("div");
  main.appendChild(h1);
  main.appendChild(form);
  main.appendChild(utility);
  rootDiv.appendChild(header);
  rootDiv.appendChild(main);
  body.appendChild(rootDiv);

  const locationObj = { pathname, search: "", hash, href: `http://localhost${pathname}${hash}` };
  const doc = {
    documentElement,
    head,
    body,
    visibilityState: "visible",
    hidden: false,
    adoptedStyleSheets: [],
    styleSheets: [],
    createElement: (tag) => new MockElement(tag),
    getElementById: (id) => elementsById.get(id) || null,
    getElementsByTagName: (tag) => documentElement.querySelectorAll(String(tag)),
    querySelector: (sel) => documentElement.querySelector(sel),
    querySelectorAll: (sel) => documentElement.querySelectorAll(sel),
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  class FakeBlob {
    constructor(parts, opts) {
      this.parts = parts;
      this.type = opts?.type || "";
    }
  }

  const FakeURL = {
    createObjectURL(blob) {
      blobSeq += 1;
      const url = `blob:codex-test/${blobSeq}`;
      createdBlobs.set(url, blob);
      return url;
    },
    revokeObjectURL(url) {
      revokedBlobs.add(url);
      createdBlobs.delete(url);
    },
  };

  class FakeMutationObserver {
    constructor(cb) {
      this.cb = cb;
      this.disconnected = false;
    }
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
    takeRecords() {
      return [];
    }
  }

  const win = {
    document: doc,
    location: locationObj,
    innerWidth: 1280,
    innerHeight: 800,
    history: {
      pushState(_state, _title, nextUrl) {
        locationObj.pathname = String(nextUrl || "/");
      },
      replaceState(_state, _title, nextUrl) {
        locationObj.pathname = String(nextUrl || "/");
      },
    },
    matchMedia: (query) => ({
      matches: appearance === "dark" && query.includes("dark"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    getComputedStyle: () => ({
      backgroundColor: "rgba(0, 0, 0, 0)",
      color: "rgb(255, 255, 255)",
      getPropertyValue: () => "",
    }),
    addEventListener: (t, fn) => {
      if (!listeners.has(t)) listeners.set(t, new Set());
      listeners.get(t).add(fn);
    },
    removeEventListener: (t, fn) => {
      listeners.get(t)?.delete(fn);
    },
    MutationObserver: FakeMutationObserver,
    Blob: FakeBlob,
    URL: FakeURL,
    URLSearchParams,
    Event: class MockEvent {
      constructor(type, opts) {
        this.type = type;
        this.bubbles = Boolean(opts?.bubbles);
      }
    },
    CSSStyleSheet: class MockCSSStyleSheet {
      constructor() {
        this.cssText = "";
      }
      replaceSync(text) {
        this.cssText = String(text || "");
      }
    },
    performance: { now: () => Date.now() },
    atob: (b64) => Buffer.from(b64, "base64").toString("binary"),
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    cancelAnimationFrame: (id) => clearTimeout(id),
    setTimeout: (fn, ms, ...args) => {
      const id = setTimeout(fn, ms, ...args);
      id?.unref?.();
      return id;
    },
    clearTimeout,
    setInterval: (fn, ms, ...args) => {
      const id = setInterval(fn, ms, ...args);
      id?.unref?.();
      return id;
    },
    clearInterval,
    queueMicrotask,
  };
  win.window = win;
  win.self = win;
  win.globalThis = win;

  return {
    win,
    doc,
    documentElement,
    main,
    form,
    textarea,
    h1,
    locationObj,
    createdBlobs,
    revokedBlobs,
    listeners,
  };
}

test("all 5 custom artist themes load and compile executable payloads", async () => {
  const entries = (await fs.readdir(customThemesRoot, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));
  assert.equal(entries.length, 5);

  for (const entry of entries) {
    const dir = path.join(customThemesRoot, entry.name);
    const loaded = await loadTheme(dir);
    assert.ok(["artist-v1", "artist-v2"].includes(loaded.theme.customPack));
    if (loaded.theme.customPack === "artist-v2") {
      assert.equal(loaded.theme.schemaVersion, 2);
      assert.ok(Object.keys(loaded.pageImagePaths).length >= 3);
      assert.ok(loaded.theme.pageArtMetadata);
    } else {
      assert.equal(loaded.theme.schemaVersion, 1);
    }
    const payloadResult = await loadPayload(dir, loaded);
    assert.equal(payloadResult.artistPack, loaded.theme.customPack);
    assert.match(payloadResult.payload, /dream-theme-artist|customPack/);
    assert.doesNotThrow(() => new Function(payloadResult.payload));
  }
});

test("schemaVersion 2 without customPack artist-v2 and invalid pack/path still reject", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ds-custom-reject-"));
  const pngTiny = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  try {
    const genericV2 = path.join(tmpRoot, "generic-v2");
    await fs.mkdir(genericV2, { recursive: true });
    await fs.writeFile(path.join(genericV2, "bg.png"), pngTiny);
    await fs.writeFile(
      path.join(genericV2, "theme.json"),
      JSON.stringify({ schemaVersion: 2, id: "bad", name: "Bad", image: "bg.png" }),
    );
    await assert.rejects(() => loadTheme(genericV2), /Theme must use schemaVersion 1/);

    const badPack = path.join(tmpRoot, "bad-pack");
    await fs.mkdir(badPack, { recursive: true });
    await fs.writeFile(path.join(badPack, "bg.png"), pngTiny);
    await fs.writeFile(
      path.join(badPack, "theme.json"),
      JSON.stringify({ schemaVersion: 1, customPack: "artist-v99", id: "bad", name: "Bad", image: "bg.png" }),
    );
    await assert.rejects(() => loadTheme(badPack), /Unsupported customPack mode/);

    const badEscape = path.join(tmpRoot, "bad-escape");
    await fs.mkdir(badEscape, { recursive: true });
    await fs.writeFile(path.join(badEscape, "bg.png"), pngTiny);
    await fs.writeFile(path.join(badEscape, "page-home.png"), pngTiny);
    await fs.writeFile(
      path.join(badEscape, "theme.json"),
      JSON.stringify({
        schemaVersion: 2,
        customPack: "artist-v2",
        id: "bad-escape",
        name: "Bad Escape",
        image: "bg.png",
        pageImages: { home: "../secret.png" },
      }),
    );
    await assert.rejects(() => loadTheme(badEscape), /cannot escape the theme directory/);
  } finally {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }
});

test("official baseline assets do not activate artist overlay", async () => {
  const officialDir = path.join(repoRoot, "windows", "assets");
  const loaded = await loadTheme(officialDir);
  assert.equal(loaded.theme.customPack, undefined);
  const res = await loadPayload(officialDir, loaded);
  assert.equal(res.artistPack, undefined);
  assert.ok(!res.payload.includes("codex-dream-skin-artist-style"));
});

test("artist overlay mounts cleanly in mock DOM and cleanup removes 100% of artifacts and blobs", async () => {
  const softDir = path.join(customThemesRoot, "custom-aurora-soft-ascension");
  const { payload } = await loadPayload(softDir);
  const dom = createMockDom({ pathname: "/", appearance: "dark" });
  try {
    const result = vm.runInNewContext(payload, dom.win);
    assert.equal(result.installed, true);
    assert.equal(result.customPack, "artist-v2");
    assert.equal(result.artistClass, "dream-theme-aurora");

    assert.ok(dom.doc.getElementById("codex-dream-skin-artist-style"));
    assert.ok(dom.documentElement.classList.contains("codex-dream-skin"));
    assert.ok(dom.documentElement.classList.contains("dream-theme-artist"));
    assert.ok(dom.documentElement.classList.contains("dream-theme-aurora"));
    assert.ok(dom.documentElement.classList.contains("dream-page-home"));
    assert.match(dom.documentElement.style.getPropertyValue("--dream-art-url"), /blob:/);

    const brand = dom.doc.getElementById("codex-billie-home-brand");
    const deck = dom.doc.getElementById("codex-billie-home-deck");
    assert.ok(brand);
    assert.ok(deck);
    assert.equal(deck.children.length, 4);

    // Clicking first quickstart button populates the composer textarea
    deck.children[0].click();
    assert.ok(dom.textarea.value.length > 0);
    assert.equal(dom.textarea.focused, true);

    // Verify cleanup leaves zero custom styles, nodes, classes, compat attrs, or live artist blobs
    assert.equal(typeof dom.win.__CODEX_DREAM_SKIN_STATE__?.cleanup, "function");
    dom.win.__CODEX_DREAM_SKIN_STATE__.cleanup();

    assert.equal(dom.doc.getElementById("codex-dream-skin-artist-style"), null);
    assert.equal(dom.doc.getElementById("codex-billie-home-brand"), null);
    assert.equal(dom.doc.getElementById("codex-billie-home-deck"), null);
    for (const cls of dom.documentElement.classList) {
      assert.ok(!cls.startsWith("dream-") && cls !== "codex-dream-skin", `lingering class ${cls}`);
    }
    for (const [k] of dom.documentElement.style.props) {
      assert.ok(!k.startsWith("--dream-"), `lingering css var ${k}`);
    }
    assert.equal(dom.main.getAttribute("data-dream-compat-main"), null);
    assert.equal(dom.form.getAttribute("data-dream-compat-composer"), null);
    assert.equal(dom.createdBlobs.size, 0);
    assert.ok(dom.revokedBlobs.size >= 4);
  } finally {
    try { dom.win.__CODEX_DREAM_SKIN_STATE__?.cleanup?.(); } catch {}
  }
});

test("artist-v2 mirror moods switches page artwork & class dynamically on task route", async () => {
  const mirrorDir = path.join(customThemesRoot, "custom-billie-mirror-moods");
  const { payload } = await loadPayload(mirrorDir);
  const dom = createMockDom({ pathname: "/", appearance: "dark" });
  try {
    vm.runInNewContext(payload, dom.win);
    const homeUrl = dom.documentElement.style.getPropertyValue("--dream-art-url");

    dom.documentElement.setAttribute("data-ds-route", "task");
    dom.win.history.pushState({}, "", "/threads/demo-123");
    await new Promise((resolve) => setTimeout(resolve, 25));

    assert.ok(dom.documentElement.classList.contains("dream-theme-billie-mirror"));
    assert.ok(dom.documentElement.classList.contains("dream-page-task"));
    const taskUrl = dom.documentElement.style.getPropertyValue("--dream-art-url");
    assert.notEqual(taskUrl, homeUrl);
    assert.equal(dom.doc.getElementById("codex-billie-home-deck"), null);
  } finally {
    try { dom.win.__CODEX_DREAM_SKIN_STATE__?.cleanup?.(); } catch {}
  }
});

test("studio-v1 exports valid Safe CSS, strict schemaVersion 1 JSON, and 3-entry ZIP archives", async () => {
  const dirs = (await fs.readdir(studioRoot, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  assert.equal(dirs.length, 5);

  for (const id of dirs) {
    const pkgDir = path.join(studioRoot, id);
    const theme = JSON.parse(await fs.readFile(path.join(pkgDir, "theme.json"), "utf8"));
    const css = await fs.readFile(path.join(pkgDir, "theme.css"), "utf8");
    const zipBytes = await fs.readFile(path.join(studioRoot, `${id}.zip`));

    assert.equal(theme.schemaVersion, 1);
    assert.equal(theme.id, id);
    assert.equal(theme.image, "background.jpg");
    assert.equal(theme.customPack, undefined);
    assert.equal(Object.keys(theme.colors).length, 10);
    assert.doesNotThrow(() => validateSafeCss(css));
    assert.equal(zipBytes.subarray(0, 2).toString("ascii"), "PK");
    assert.ok(zipBytes.includes(Buffer.from("theme.json", "utf8")));
    assert.ok(zipBytes.includes(Buffer.from("background.jpg", "utf8")));
    assert.ok(zipBytes.includes(Buffer.from("theme.css", "utf8")));
  }
});
