(function () {
  "use strict";

  const BUILD_ROOT = "Build";
  const BUILD_NAME = "Neoto";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.matchMedia("(pointer: coarse)").matches);

  const canvas = document.getElementById("unity-canvas");
  const loadingScreen = document.getElementById("unity-loading");
  const progressBar = document.getElementById("unity-progress");
  const loadingStatus = document.getElementById("loading-status");
  const fullscreenButton = document.getElementById("fullscreen-button");
  const loadError = document.getElementById("load-error");
  const retryButton = document.getElementById("retry-button");
  const warningBanner = document.getElementById("unity-warning");
  const copyrightYear = document.getElementById("copyright-year");

  let unityInstance = null;
  let loadingStarted = false;

  if (copyrightYear) {
    copyrightYear.textContent = String(new Date().getFullYear());
  }

  function showUnityBanner(message, type) {
    if (!warningBanner) return;
    const item = document.createElement("div");
    item.textContent = message;
    item.dataset.type = type || "warning";
    warningBanner.appendChild(item);
    if (type !== "error") {
      window.setTimeout(() => item.remove(), 6000);
    }
  }

  function updateProgress(progress) {
    const safeProgress = Math.max(0, Math.min(1, Number(progress) || 0));
    if (progressBar) progressBar.style.width = `${Math.round(safeProgress * 100)}%`;
    if (loadingStatus) {
      loadingStatus.textContent = safeProgress < 0.97
        ? `Loading world… ${Math.round(safeProgress * 100)}%`
        : "Starting Neoto…";
    }
  }

  function showLoadFailure(error) {
    console.error("Neoto failed to load", error);
    if (loadingScreen) loadingScreen.classList.add("is-hidden");
    if (loadError) loadError.hidden = false;
  }

  function enterFullscreen() {
    if (unityInstance && typeof unityInstance.SetFullscreen === "function") {
      unityInstance.SetFullscreen(1);
      return;
    }
    const frame = document.getElementById("game-frame");
    if (frame && frame.requestFullscreen) frame.requestFullscreen();
  }

  async function startUnity() {
    if (loadingStarted || !canvas) return;
    loadingStarted = true;
    if (loadError) loadError.hidden = true;
    if (loadingScreen) loadingScreen.classList.remove("is-hidden");
    updateProgress(0);

    const config = {
      arguments: [],
      dataUrl: `${BUILD_ROOT}/${BUILD_NAME}.data.unityweb`,
      frameworkUrl: `${BUILD_ROOT}/${BUILD_NAME}.framework.js.unityweb`,
      codeUrl: `${BUILD_ROOT}/${BUILD_NAME}.wasm.unityweb`,
      streamingAssetsUrl: "StreamingAssets",
      companyName: "Neoto",
      productName: "Neoto",
      productVersion: "0.1.0",
      showBanner: showUnityBanner,
      autoSyncPersistentDataPath: true
    };

    config.devicePixelRatio = Math.min(
    window.devicePixelRatio || 1,
    2
);

config.matchWebGLToCanvasSize = true;

    try {
      await loadScript(`${BUILD_ROOT}/${BUILD_NAME}.loader.js`);
      if (typeof window.createUnityInstance !== "function") {
        throw new Error("Unity loader did not provide createUnityInstance.");
      }
      unityInstance = await window.createUnityInstance(canvas, config, updateProgress);
      if (loadingScreen) loadingScreen.classList.add("is-hidden");
      if (fullscreenButton) fullscreenButton.disabled = false;
      canvas.focus({ preventScroll: true });
      window.neotoUnityInstance = unityInstance;
      window.dispatchEvent(new CustomEvent("neoto:ready"));
    } catch (error) {
      loadingStarted = false;
      showLoadFailure(error);
    }
  }

  function loadScript(source, options) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${source}"]`);
      if (existing) {
        if (existing.dataset.loaded === "true") resolve(existing);
        else {
          existing.addEventListener("load", () => resolve(existing), { once: true });
          existing.addEventListener("error", reject, { once: true });
        }
        return;
      }

      const script = document.createElement("script");
      script.src = source;
      script.async = options?.async !== false;
      if (options?.crossOrigin) script.crossOrigin = options.crossOrigin;
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve(script);
      }, { once: true });
      script.addEventListener("error", () => reject(new Error(`Could not load ${source}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  function isValidPublisherId(value) {
    return /^ca-pub-\d{10,}$/.test(value || "");
  }

  function isValidSlotId(value) {
    return /^\d{5,}$/.test(value || "");
  }

  function mountDisplayAd(regionId, slotId, format) {
    const region = document.getElementById(regionId);
    const config = window.NEOTO_ADS_CONFIG || {};
    if (!region || !isValidPublisherId(config.client) || !isValidSlotId(slotId)) return;

    const slot = region.querySelector(".ad-slot");
    if (!slot) return;
    const ad = document.createElement("ins");
    ad.className = "adsbygoogle";
    ad.style.display = "block";
    ad.dataset.adClient = config.client;
    ad.dataset.adSlot = slotId;
    ad.dataset.adFormat = format;
    ad.dataset.fullWidthResponsive = "true";
    slot.replaceChildren(ad);
    region.hidden = false;
    if (regionId === "desktop-ad-region") {
      document.querySelector(".game-layout")?.classList.add("has-ads");
    }
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  }

  async function initializeAds() {
    const config = window.NEOTO_ADS_CONFIG || {};
    if (!config.enabled || !isValidPublisherId(config.client)) return;

    try {
      await loadScript(
        `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.client)}`,
        { crossOrigin: "anonymous" }
      );
      if (window.matchMedia("(min-width: 1760px)").matches) {
        mountDisplayAd("desktop-ad-region", config.desktopBannerSlot, "auto");
      }
      mountDisplayAd("content-ad-region", config.contentBannerSlot, "auto");
    } catch (error) {
      console.warn("Ads were unavailable; Neoto will continue without them.", error);
    }
  }

  // Unity can safely call these later through a WebGL bridge. Until the site
  // has H5 Games Ads approval, they deliberately do nothing.
  window.NeotoAds = Object.freeze({
    requestInterstitial: function () {
      return Promise.resolve({ shown: false, reason: "not-configured" });
    },
    requestRewarded: function () {
      return Promise.resolve({ shown: false, rewarded: false, reason: "not-configured" });
    }
  });

  fullscreenButton?.addEventListener("click", enterFullscreen);
  retryButton?.addEventListener("click", () => window.location.reload());
  document.addEventListener("fullscreenchange", () => canvas?.focus({ preventScroll: true }));

  // Start Unity first. Advertising is not requested until the Unity download
  // has completed, so ad servers can never compete with the first game load.
  window.addEventListener("neoto:ready", initializeAds, { once: true });
  startUnity();
})();
