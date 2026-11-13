((coreResult, artistCssText, pageArtDataUrls, rawConfig) => {
  if (!coreResult || !coreResult.installed) return coreResult;
  const pack = rawConfig?.customPack;
  if (pack !== "artist-v1" && pack !== "artist-v2") return coreResult;
  if (typeof document === "undefined" || !document.documentElement) return coreResult;

  const STATE_KEY = "__CODEX_DREAM_SKIN_STATE__";
  const STYLE_ID = "codex-dream-skin-artist-style";
  const BRAND_ID = "codex-billie-home-brand";
  const DECK_ID = "codex-billie-home-deck";
  const ARTIST_PROFILES = {
    "custom-billie-blue-hour": {
      artistClass: "dream-theme-billie",
      eyebrow: "BLUE HOUR / EDITORIAL",
      cards: [
        { kicker: "Explore", title: "梳理项目结构与核心模块", desc: "快速定位关键入口与状态流", prompt: "请梳理当前仓库的核心目录结构与主要数据流，指出关键入口文件。" },
        { kicker: "Refine", title: "审视交互细节与视觉质感", desc: "检查边界状态、排版与可访问性", prompt: "请审查当前界面与交互流程，列出可打磨的细节与潜在边界问题。" },
        { kicker: "Build", title: "实现新功能并补齐回归测试", desc: "按既有架构增量改动并验证", prompt: "我想基于现有架构新增一项能力，先给出最小改动方案再开始实现。" },
        { kicker: "Debug", title: "定位异常行为与性能瓶颈", desc: "从现象回溯到根因与修复方案", prompt: "请帮我排查当前遇到的异常现象，结合日志与代码定位根本原因。" },
      ],
    },
    "custom-billie-mirror-moods": {
      artistClass: "dream-theme-billie-mirror",
      eyebrow: "MIRROR MOODS / MULTI-SCENE",
      cards: [
        { kicker: "Architecture", title: "拆解模块边界与依赖关系", desc: "让核心能力与扩展包互不干扰", prompt: "请分析当前模块之间的边界和依赖关系，指出潜在耦合点与解耦方案。" },
        { kicker: "Feature", title: "设计并落地多场景适配", desc: "覆盖 Home / Task / Settings 状态", prompt: "请帮我梳理不同页面状态的适配规则，并实现可回滚的增量改动。" },
        { kicker: "Review", title: "做一轮严谨的代码与测试审查", desc: "检查回归风险与遗漏断言", prompt: "请对近期改动执行一次全面审阅，关注边界条件、兼容性与测试覆盖。" },
        { kicker: "Triage", title: "排查构建或测试失败原因", desc: "逐项核对前置条件与环境状态", prompt: "请运行相关检查并根据真实输出来定位当前失败或告警的原因。" },
      ],
    },
    "custom-justin-purpose-noir": {
      artistClass: "dream-theme-justin",
      eyebrow: "PURPOSE NOIR / STUDIO",
      cards: [
        { kicker: "Trace", title: "追踪执行链路与状态变更", desc: "端到端定位输入输出行为", prompt: "请顺着执行链路追踪核心调用路径，说明状态是如何流转和落盘的。" },
        { kicker: "Ship", title: "制定清晰步骤并稳步推进", desc: "先验证约束再改动关键文件", prompt: "请列出完成当前需求的最小可行步骤，并在每一步后执行验证。" },
        { kicker: "Audit", title: "检查安全校验与契约兼容", desc: "确保校验规则与上下游一致", prompt: "请检查相关校验逻辑与数据结构契约，确认没有破坏既有兼容约束。" },
        { kicker: "Fix", title: "复现并根治棘手问题", desc: "只依据实测证据给出精准修复", prompt: "请复现这个问题并定位根因，再提供干净的修复方案和验证测试。" },
      ],
    },
    "custom-aurora-soft-ascension": {
      artistClass: "dream-theme-aurora",
      eyebrow: "SOFT ASCENSION / ATELIER",
      cards: [
        { kicker: "Map", title: "测绘代码库脉络与设计意图", desc: "先看清全局结构再动手编辑", prompt: "请概括这个项目的整体设计思路与核心文件分工。" },
        { kicker: "Craft", title: "打磨界面体验与样式层级", desc: "兼顾深浅主题与视觉平衡", prompt: "请帮我优化现有样式层级与细节质感，避免与其他主题互相干扰。" },
        { kicker: "Verify", title: "补全自动化测试与契约守护", desc: "确保每次切换和回滚都干净彻底", prompt: "请为这部分逻辑补充自动化测试，验证启用、切换和清理的全流程。" },
        { kicker: "Resolve", title: "诊断冲突并理顺依赖链路", desc: "定位隐藏耦合与残留状态", prompt: "请帮我诊断当前可能存在的冲突或残留状态，并给出清理方案。" },
      ],
    },
    "custom-aurora-runaway-bloom": {
      artistClass: "dream-theme-aurora-classic",
      eyebrow: "RUNAWAY BLOOM / VIOLET",
      cards: [
        { kicker: "Explore", title: "快速理解仓库职责划分", desc: "理清脚本、样式与打包边界", prompt: "请介绍这个仓库中各个核心目录和脚本分别承担什么职责。" },
        { kicker: "Enhance", title: "安全扩展自定义视觉能力", desc: "保持上游官方能力完全原样", prompt: "请在不破坏官方核心逻辑的前提下，为当前功能增加可扩展钩子。" },
        { kicker: "Check", title: "验证配置与清单校验逻辑", desc: "逐项核对字段格式与限制", prompt: "请核对相关配置文件与校验规则，确保所有字段和资源都符合约束。" },
        { kicker: "Polish", title: "排查细节瑕疵并完成收尾", desc: "确认文字可读性与清理完整性", prompt: "请检查当前改动是否还有残留样式或边界疏漏，并执行完整测试。" },
      ],
    },
  };

  const DEFAULT_PROFILE = {
    artistClass: "dream-theme-aurora-classic",
    eyebrow: "DREAM SKIN / ARTIST PACK",
    cards: ARTIST_PROFILES["custom-aurora-runaway-bloom"].cards,
  };

  const profile = ARTIST_PROFILES[rawConfig?.id] || DEFAULT_PROFILE;
  const ARTIST_CLASS_NAMES = [
    "codex-dream-skin",
    "dream-theme-artist",
    "dream-theme-billie",
    "dream-theme-billie-mirror",
    "dream-theme-justin",
    "dream-theme-aurora",
    "dream-theme-aurora-classic",
    "dream-theme-light",
    "dream-theme-dark",
    "dream-page-home",
    "dream-page-task",
    "dream-page-settings",
    "dream-page-utility",
    "dream-art-wide",
    "dream-art-standard",
    "dream-focus-left",
    "dream-focus-center",
    "dream-focus-right",
    "dream-focus-top",
    "dream-focus-editorial",
    "dream-safe-left",
    "dream-safe-right",
    "dream-safe-center",
    "dream-safe-none",
    "dream-safe-narrow",
    "dream-safe-settings",
    "dream-task-ambient",
    "dream-task-framed",
    "dream-task-focus",
  ];
  const DREAM_CSS_VARS = [
    "--dream-art-url",
    "--dream-art-pos",
    "--dream-accent",
    "--dream-accent-strong",
    "--dream-accent-soft",
    "--dream-image-luma",
    "--dream-user-alpha",
  ];

  const createdBlobUrls = [];
  const toArtUrl = (dataUrl) => {
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;
    try {
      if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function" &&
        typeof Blob === "function" && typeof atob === "function") {
        const comma = dataUrl.indexOf(",");
        if (comma > 0) {
          const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1] || "image/jpeg";
          const binary = atob(dataUrl.slice(comma + 1));
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
          createdBlobUrls.push(blobUrl);
          return blobUrl;
        }
      }
    } catch {}
    return dataUrl;
  };

  const pageUrls = {};
  if (pageArtDataUrls && typeof pageArtDataUrls === "object") {
    for (const [role, dataUrl] of Object.entries(pageArtDataUrls)) {
      const resolved = toArtUrl(dataUrl);
      if (resolved) pageUrls[role] = resolved;
    }
  }

  let lumaCache = rawConfig?.artMetadata?.luma ?? (rawConfig?.appearance === "light" ? 0.72 : 0.28);
  const touchedElements = new Set();
  let disposed = false;
  let ensuring = false;
  let scheduledTimer = null;
  let observer = null;
  let origPushState = null;
  let origReplaceState = null;

  const clamp01 = (value, fallback) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
    return Math.min(1, Math.max(0, value));
  };

  const detectShellAppearance = () => {
    if (rawConfig?.appearance === "light" || rawConfig?.appearance === "dark") {
      return rawConfig.appearance;
    }
    const root = document.documentElement;
    const dataTheme = root.getAttribute("data-theme");
    if (dataTheme === "light" || dataTheme === "dark") return dataTheme;
    if (root.classList.contains("electron-light")) return "light";
    if (root.classList.contains("electron-dark")) return "dark";
    try {
      if (typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-color-scheme: light)").matches) {
        return "light";
      }
    } catch {}
    return "dark";
  };

  const detectRoute = () => {
    let routeHint = "";
    try {
      routeHint = `${window.location?.pathname || ""} ${window.location?.hash || ""}`.toLowerCase();
    } catch {}
    if (/\/settings\b|#\/?settings\b/.test(routeHint)) return "settings";
    if (/\/(skills|plugins|automations|mcp|marketplace|extensions|library)\b/.test(routeHint)) {
      return "utility";
    }
    if (/\/(threads?|tasks?|t|sessions?)\b/.test(routeHint)) return "task";

    const domDsRoute = document.documentElement.getAttribute("data-ds-route");
    if (domDsRoute === "settings") return "settings";
    if (domDsRoute === "utility") return "utility";
    if (domDsRoute === "task" || domDsRoute === "thread") return "task";

    try {
      if (document.querySelector('[data-dream-compat-composer="true"], textarea') &&
        document.querySelector('[data-testid*="thread"], [data-testid*="conversation"], [class*="message-list"]')) {
        return "task";
      }
    } catch {}
    return "home";
  };

  const attachStylesheet = () => {
    if (!artistCssText || typeof document.getElementById !== "function") return null;
    let styleEl = document.getElementById(STYLE_ID);
    if (!styleEl && typeof document.createElement === "function") {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;
      styleEl.setAttribute("data-dream-artist-style", "true");
      (document.head || document.documentElement).appendChild(styleEl);
    }
    if (styleEl && styleEl.textContent !== artistCssText) {
      styleEl.textContent = artistCssText;
    }
    return styleEl;
  };

  const findMainElement = () => {
    try {
      return document.querySelector?.("main, [role='main']") || null;
    } catch {
      return null;
    }
  };

  const findComposerForm = (mainEl) => {
    const scope = mainEl || document;
    try {
      const explicit = scope.querySelector?.("[data-testid*='composer'], form");
      if (explicit) return explicit;
      const textarea = scope.querySelector?.("textarea, [contenteditable='true']");
      return textarea?.closest?.("form") || textarea?.parentElement || null;
    } catch {
      return null;
    }
  };

  const fillComposerPrompt = (promptText) => {
    try {
      const mainEl = findMainElement() || document;
      const input = mainEl.querySelector?.("textarea, input[type='text'], [contenteditable='true']");
      if (!input) return;
      input.focus?.();
      if ("value" in input && !input.getAttribute?.("contenteditable")) {
        const proto = Object.getPrototypeOf(input);
        const descriptor = proto && Object.getOwnPropertyDescriptor(proto, "value");
        if (descriptor?.set) descriptor.set.call(input, promptText);
        else input.value = promptText;
      } else {
        input.textContent = promptText;
      }
      if (typeof Event === "function") {
        input.dispatchEvent?.(new Event("input", { bubbles: true }));
        input.dispatchEvent?.(new Event("change", { bubbles: true }));
      }
    } catch {}
  };

  const markNode = (node, { attrs = [], classes = [] }) => {
    if (!node || typeof node.setAttribute !== "function") return;
    touchedElements.add(node);
    for (const [k, v] of attrs) {
      if (node.getAttribute(k) !== v) node.setAttribute(k, v);
    }
    for (const cls of classes) {
      if (node.classList && !node.classList.contains(cls)) node.classList.add(cls);
    }
  };

  const syncHomeWidgets = (route, mainEl, composerEl, appearance) => {
    if (route !== "home" || !mainEl || typeof document.createElement !== "function") {
      document.getElementById?.(BRAND_ID)?.remove?.();
      document.getElementById?.(DECK_ID)?.remove?.();
      return;
    }

    let heading = null;
    try {
      heading = mainEl.querySelector?.("h1, h2, [data-testid*='hero-heading']") || null;
    } catch {}
    if (heading) {
      markNode(heading, { classes: ["dream-home-hero-heading"] });
    }

    const host = heading?.parentElement || composerEl?.parentElement || mainEl;
    if (!host || typeof host.insertBefore !== "function") return;

    let brand = document.getElementById?.(BRAND_ID);
    if (!brand) {
      brand = document.createElement("div");
      brand.id = BRAND_ID;
      brand.setAttribute("data-dream-artist-widget", "brand");

      const eyebrow = document.createElement("span");
      eyebrow.className = "dream-artist-eyebrow";
      eyebrow.textContent = rawConfig?.brandSubtitle || profile.eyebrow;

      const title = document.createElement("div");
      title.className = "dream-artist-title";
      title.textContent = rawConfig?.name || "Codex Dream Skin";

      const subtitle = document.createElement("div");
      subtitle.className = "dream-artist-subtitle";
      subtitle.textContent = rawConfig?.tagline || "";

      brand.appendChild(eyebrow);
      brand.appendChild(title);
      if (rawConfig?.tagline) brand.appendChild(subtitle);
    }

    const anchorForBrand = heading || composerEl || host.firstChild;
    if (brand.parentElement !== host) {
      host.insertBefore(brand, anchorForBrand || null);
    }

    let deck = document.getElementById?.(DECK_ID);
    if (!deck) {
      deck = document.createElement("div");
      deck.id = DECK_ID;
      deck.setAttribute("data-dream-artist-widget", "deck");
      for (const card of profile.cards) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "codex-billie-quickstart";
        button.setAttribute("data-dream-prompt", card.prompt);

        const kicker = document.createElement("span");
        kicker.className = "codex-billie-quickstart-kicker";
        kicker.textContent = card.kicker;

        const title = document.createElement("span");
        title.className = "codex-billie-quickstart-title";
        title.textContent = card.title;

        const desc = document.createElement("span");
        desc.className = "codex-billie-quickstart-desc";
        desc.textContent = card.desc;

        button.appendChild(kicker);
        button.appendChild(title);
        button.appendChild(desc);
        button.addEventListener?.("click", () => fillComposerPrompt(card.prompt));
        deck.appendChild(button);
      }
    }

    if (deck.parentElement !== host) {
      if (composerEl && composerEl.parentElement === host) {
        host.insertBefore(deck, composerEl);
      } else {
        host.appendChild(deck);
      }
    }

    markNode(mainEl, {
      attrs: [["data-dream-artist-appearance", appearance]],
      classes: ["dream-home", "dream-home-shell"],
    });
    if (composerEl) {
      markNode(composerEl, {
        attrs: [["data-dream-compat-composer", "true"]],
        classes: ["dream-home-composer-shell"],
      });
    }
    const utilityRail = composerEl?.nextElementSibling;
    if (utilityRail) {
      markNode(utilityRail, { classes: ["dream-home-utility"] });
    }
  };

  const sampleImageLuma = (artUrl) => {
    if (!artUrl || typeof window.Image !== "function" || typeof document.createElement !== "function") {
      return;
    }
    try {
      const image = new window.Image();
      image.onload = () => {
        if (disposed) return;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 24;
          canvas.height = 24;
          const ctx = canvas.getContext?.("2d", { willReadFrequently: true });
          if (!ctx) return;
          ctx.drawImage(image, 0, 0, 24, 24);
          const data = ctx.getImageData(0, 0, 24, 24).data;
          let total = 0;
          let count = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 32) continue;
            total += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
            count += 1;
          }
          if (count > 0) {
            lumaCache = Number((total / count).toFixed(3));
            document.documentElement.style?.setProperty?.("--dream-image-luma", String(lumaCache));
          }
        } catch {}
      };
      image.src = artUrl;
    } catch {}
  };

  const applyOverlay = () => {
    if (disposed || ensuring) return;
    ensuring = true;
    try {
      attachStylesheet();
      const root = document.documentElement;
      const route = detectRoute();
      const appearance = detectShellAppearance();
      const pageArtEntry = rawConfig?.pageArt?.[route] || {};
      const focusX = clamp01(pageArtEntry.focusX ?? rawConfig?.art?.focusX, 0.5);
      const focusY = clamp01(pageArtEntry.focusY ?? rawConfig?.art?.focusY, 0.45);
      const safeArea = pageArtEntry.safeArea || rawConfig?.art?.safeArea || "left";
      const taskMode = pageArtEntry.taskMode || rawConfig?.art?.taskMode || "ambient";
      const accent = pageArtEntry.accent || rawConfig?.colors?.accent || rawConfig?.palette?.accent || null;
      const activeArtUrl = pageUrls[route] || pageUrls.home || pageUrls.default || null;
      const artMeta = rawConfig?.pageArtMetadata?.[route] || rawConfig?.artMetadata || {};
      const isWide = Boolean(
        artMeta.wide ||
        artMeta.aspect === "wide" ||
        artMeta.aspect === "ultrawide" ||
        (artMeta.width && artMeta.height && artMeta.width / artMeta.height >= 1.2),
      );

      for (const cls of ARTIST_CLASS_NAMES) {
        root.classList?.remove?.(cls);
      }

      const nextClasses = [
        "codex-dream-skin",
        "dream-theme-artist",
        profile.artistClass,
        appearance === "light" ? "dream-theme-light" : "dream-theme-dark",
        `dream-page-${route}`,
        isWide ? "dream-art-wide" : "dream-art-standard",
        focusX < 0.38 ? "dream-focus-left" : focusX > 0.62 ? "dream-focus-right" : "dream-focus-center",
        `dream-safe-${safeArea}`,
        `dream-task-${taskMode}`,
      ];
      if (focusY < 0.34) nextClasses.push("dream-focus-top");
      if (profile.artistClass === "dream-theme-billie" || profile.artistClass === "dream-theme-aurora-classic") {
        nextClasses.push("dream-focus-editorial");
      }
      if (route === "settings" || route === "utility") {
        nextClasses.push("dream-safe-narrow");
        if (route === "settings") nextClasses.push("dream-safe-settings");
      }

      for (const cls of nextClasses) {
        root.classList?.add?.(cls);
      }

      if (root.style?.setProperty) {
        if (activeArtUrl) root.style.setProperty("--dream-art-url", `url(${JSON.stringify(activeArtUrl)})`);
        root.style.setProperty("--dream-art-pos", `${(focusX * 100).toFixed(2)}% ${(focusY * 100).toFixed(2)}%`);
        if (accent) root.style.setProperty("--dream-accent", String(accent));
        root.style.setProperty("--dream-image-luma", String(lumaCache));
        if (typeof rawConfig?.userTransparency === "number" && Number.isFinite(rawConfig.userTransparency)) {
          root.dataset.dreamUserAlpha = "true";
          root.style.setProperty("--dream-user-alpha", String(rawConfig.userTransparency));
        } else {
          delete root.dataset?.dreamUserAlpha;
          root.style.removeProperty?.("--dream-user-alpha");
        }
      }

      const mainEl = findMainElement();
      if (mainEl) {
        const mainClasses = route === "task" ? ["dream-task", "dream-task-stage"]
          : route === "settings" ? ["dream-safe-settings", "dream-safe-stage"]
          : route === "utility" ? ["dream-safe-stage"]
          : ["dream-home", "dream-home-shell"];
        markNode(mainEl, {
          attrs: [["data-dream-compat-main", "true"]],
          classes: mainClasses,
        });
      }

      const headerEl = document.querySelector?.("header, [data-testid*='header']");
      if (headerEl) {
        markNode(headerEl, { attrs: [["data-dream-compat-header", "true"]] });
      }
      const appMenuEl = document.querySelector?.(
        "header [aria-label*='菜单'], header [aria-label*='Menu'], header [data-testid*='menu'], [data-testid='application-menu']",
      );
      if (appMenuEl) {
        markNode(appMenuEl, { attrs: [["data-dream-compat-application-menu", "true"]] });
      }

      const composerEl = findComposerForm(mainEl);
      if (composerEl) {
        markNode(composerEl, { attrs: [["data-dream-compat-composer", "true"]] });
      }

      syncHomeWidgets(route, mainEl, composerEl, appearance);
    } finally {
      ensuring = false;
    }
  };

  const scheduleApply = () => {
    if (disposed || scheduledTimer) return;
    if (typeof queueMicrotask === "function") {
      scheduledTimer = true;
      queueMicrotask(() => {
        scheduledTimer = null;
        applyOverlay();
      });
    } else {
      applyOverlay();
    }
  };

  const onRouteChange = () => scheduleApply();

  if (typeof window !== "undefined") {
    window.addEventListener?.("popstate", onRouteChange);
    window.addEventListener?.("hashchange", onRouteChange);
    try {
      if (window.history && typeof window.history.pushState === "function") {
        origPushState = window.history.pushState;
        window.history.pushState = function (...args) {
          const result = origPushState.apply(this, args);
          onRouteChange();
          return result;
        };
      }
      if (window.history && typeof window.history.replaceState === "function") {
        origReplaceState = window.history.replaceState;
        window.history.replaceState = function (...args) {
          const result = origReplaceState.apply(this, args);
          onRouteChange();
          return result;
        };
      }
    } catch {}
  }

  if (typeof MutationObserver === "function") {
    try {
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          const target = mutation?.target;
          if (target?.id === BRAND_ID || target?.id === DECK_ID) continue;
          scheduleApply();
          return;
        }
      });
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-theme", "data-ds-route", "class"],
      });
    } catch {}
  }

  applyOverlay();
  sampleImageLuma(pageUrls.home || pageUrls.default);

  const prevState = typeof window !== "undefined" ? window[STATE_KEY] : null;
  const baseCleanup = typeof prevState?.cleanup === "function" ? prevState.cleanup : null;

  const artistCleanup = () => {
    if (disposed) return;
    disposed = true;
    scheduledTimer = null;
    try { observer?.disconnect?.(); } catch {}
    observer = null;

    if (typeof window !== "undefined") {
      window.removeEventListener?.("popstate", onRouteChange);
      window.removeEventListener?.("hashchange", onRouteChange);
      try {
        if (origPushState && window.history) window.history.pushState = origPushState;
        if (origReplaceState && window.history) window.history.replaceState = origReplaceState;
      } catch {}
    }

    document.getElementById?.(STYLE_ID)?.remove?.();
    document.getElementById?.(BRAND_ID)?.remove?.();
    document.getElementById?.(DECK_ID)?.remove?.();

    const root = document.documentElement;
    if (root) {
      for (const cls of ARTIST_CLASS_NAMES) {
        root.classList?.remove?.(cls);
      }
      for (const cssVar of DREAM_CSS_VARS) {
        root.style?.removeProperty?.(cssVar);
      }
      if (root.dataset) {
        delete root.dataset.dreamUserAlpha;
        delete root.dataset.dreamArtistAppearance;
      }
    }

    const compatAttrs = [
      "data-dream-compat-main",
      "data-dream-compat-header",
      "data-dream-compat-application-menu",
      "data-dream-compat-composer",
      "data-dream-artist-appearance",
    ];
    for (const node of touchedElements) {
      try {
        for (const cls of ARTIST_CLASS_NAMES) node.classList?.remove?.(cls);
        node.classList?.remove?.(
          "dream-home",
          "dream-home-shell",
          "dream-home-utility",
          "dream-home-hero-heading",
          "dream-home-composer-shell",
          "dream-task",
          "dream-task-stage",
          "dream-safe-stage",
          "dream-safe-settings",
        );
        for (const attr of compatAttrs) node.removeAttribute?.(attr);
      } catch {}
    }
    touchedElements.clear();

    try {
      for (const node of document.querySelectorAll?.(compatAttrs.map((a) => `[${a}]`).join(",")) || []) {
        for (const attr of compatAttrs) node.removeAttribute?.(attr);
      }
    } catch {}

    if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
      for (const url of createdBlobUrls) {
        try { URL.revokeObjectURL(url); } catch {}
      }
    }
    createdBlobUrls.length = 0;

    if (typeof baseCleanup === "function") {
      baseCleanup();
    }
  };

  if (prevState && typeof prevState === "object") {
    prevState.cleanup = artistCleanup;
    prevState.artistPack = pack;
    prevState.artistThemeId = rawConfig.id;
  } else if (typeof window !== "undefined") {
    window[STATE_KEY] = {
      cleanup: artistCleanup,
      artistPack: pack,
      artistThemeId: rawConfig.id,
    };
  }

  return {
    ...coreResult,
    customPack: pack,
    artistClass: profile.artistClass,
    artistCleanup,
  };
})
