const axios = require("axios");

// ─────────────────────────────────────────────
// 📦 Providers Config
// ─────────────────────────────────────────────
const PROVIDERS = {

  instagram: [
    {
      name: "ootaizumi",
      build: (url) =>
        `https://api.ootaizumi.web.id/downloader/instagram/v1?url=${encodeURIComponent(url)}`,
      extract: (data) => {
        const raw = data?.result;
        if (!raw) return null;
        const items = Array.isArray(raw) ? raw : [raw];
        return normalizeMedia(items[0]);
      },
    },
    {
      name: "apifaa",
      build: (url) =>
        `https://api-faa.my.id/faa/igdl?url=${encodeURIComponent(url)}`,
      extract: (data) => {
        const raw = data?.result;
        if (!raw) return null;
        const items = Array.isArray(raw) ? raw : [raw];
        return normalizeMedia(items[0]);
      },
    },
    {
      name: "apiskeith",
      build: (url) =>
        `https://apiskeith.top/download/instadl?url=${encodeURIComponent(url)}`,
      extract: (data) => normalizeMedia(data),
    },
  ],

  facebook: [
    {
      name: "davidcyril",
      build: (url) =>
        `https://apis.davidcyril.name.ng/facebook2?url=${encodeURIComponent(url)}`,
      extract: (data) => normalizeMedia(data?.video ?? data),
    },
    {
      name: "apiskeith-fbdl",
      build: (url) =>
        `https://apiskeith.top/download/fbdl?url=${encodeURIComponent(url)}`,
      extract: (data) => normalizeMedia(data?.result ?? data),
    },
    {
      name: "apiskeith-fbdown",
      build: (url) =>
        `https://apiskeith.top/download/fbdown?url=${encodeURIComponent(url)}`,
      extract: (data) => normalizeMedia(data?.result ?? data),
    },
  ],

  youtube: [
    {
      name: "apiskeith-mp4",
      build: (url) =>
        `https://apiskeith.top/download/dlmp4?url=${encodeURIComponent(url)}`,
      extract: (data) => normalizeMedia(data?.result ?? data),
    },
  ],

  song: [
    {
      name: "apiskeith-audio",
      build: (url) =>
        `https://apiskeith.top/download/audio?url=${encodeURIComponent(url)}`,
      extract: (data) => normalizeMedia(data?.result ?? data, "audio"),
    },
  ],

  pinterest: [
    {
      name: "davidcyril-pinterest",
      build: (url) =>
        `https://apis.davidcyril.name.ng/download/pinterest?url=${encodeURIComponent(url)}`,
      extract: (data) => {
        const d = data?.data ?? data;
        const medias = d?.medias ?? [];
        const video = medias.find((v) => v.extension === "mp4") || medias[0];
        if (!video) return null;
        return {
          ...normalizeMedia(video?.url ?? video),
          title: d?.title,
          thumbnail: d?.thumbnail,
          quality: video?.quality,
          ext: video?.extension,
          size: video?.formattedSize,
        };
      },
    },
  ],

  lyrics: [
    {
      name: "davidcyril-lyrics",
      build: (query) =>
        `https://apis.davidcyril.name.ng/lyrics3?song=${encodeURIComponent(query)}`,
      extract: (data) => ({
        lyrics: data?.result ?? data,
        result: data?.result ?? data,
      }),
    },
  ],

  image: [
    {
      name: "apiskeith-images",
      build: (query) =>
        `https://apiskeith.top/search/images?query=${encodeURIComponent(query)}`,
      extract: (data) => {
        const items = data?.result ?? [];
        return { images: items, result: items, total: items.length };
      },
    },
  ],
};

// ─────────────────────────────────────────────
// 🔧 Normalize
// ─────────────────────────────────────────────
function normalizeMedia(raw, hint = "video") {
  if (!raw) return null;

  if (typeof raw === "string" && raw.startsWith("http")) {
    return buildMediaObj(raw, hint);
  }

  const candidates = [
    "url", "video", "videoUrl", "video_url",
    "hd", "sd", "low", "high", "normal",
    "audio", "audioUrl", "audio_url",
    "download", "downloadUrl", "download_url",
    "link", "src", "source",
    "result",
  ];

  for (const key of candidates) {
    const val = raw[key];
    if (typeof val === "string" && val.startsWith("http")) {
      return buildMediaObj(val, hint, raw);
    }
    if (Array.isArray(val) && val.length && typeof val[0] === "string" && val[0].startsWith("http")) {
      return buildMediaObj(val[0], hint, raw, val);
    }
    if (val && typeof val === "object" && typeof val.url === "string") {
      return buildMediaObj(val.url, hint, raw);
    }
  }

  return null;
}

function buildMediaObj(primaryUrl, hint, meta = {}, extras = []) {
  const obj = {
    url: primaryUrl,
    result: primaryUrl,
    video: primaryUrl,
    audio: primaryUrl,
    audio2: primaryUrl,
    audio3: primaryUrl,
    download: primaryUrl,
  };

  const skip = new Set(["url", "result", "video", "audio", "download"]);
  for (const [k, v] of Object.entries(meta)) {
    if (!skip.has(k) && v !== undefined) obj[k] = v;
  }

  if (extras.length > 1) obj.urls = extras;

  return obj;
}

// ─────────────────────────────────────────────
// 🏁 Race with fallback
// ─────────────────────────────────────────────
async function raceProviders(providers, param) {
  const attempts = providers.map(async (provider) => {
    const apiUrl = provider.build(param);
    const { data } = await axios.get(apiUrl, { timeout: 10000 });
    const extracted = provider.extract(data);
    if (!extracted) throw new Error("No data extracted");
    return { ...extracted };
  });

  return Promise.any(attempts);
}

// ─────────────────────────────────────────────
// 🧰 Core fetch function
// ─────────────────────────────────────────────
async function fetch(platform, param) {
  const providers = PROVIDERS[platform];
  if (!providers || providers.length === 0) {
    throw new Error(`Unknown platform: "${platform}"`);
  }

  try {
    const result = await raceProviders(providers, param);
    return { status: true, platform, ...result };
  } catch {
    throw new Error(`All providers failed for platform: "${platform}"`);
  }
}

// ─────────────────────────────────────────────
// 📤 Public API
// ─────────────────────────────────────────────
const rabbit = {
  // Direct platform methods
  instagram: (url)   => fetch("instagram", url),
  facebook:  (url)   => fetch("facebook",  url),
  youtube:   (url)   => fetch("youtube",   url),
  ytmp4:     (url)   => fetch("youtube",   url),  // alias
  song:      (url)   => fetch("song",      url),
  pinterest: (url)   => fetch("pinterest", url),
  lyrics:    (song)  => fetch("lyrics",    song),
  image:     (query) => fetch("image",     query),

  // Generic method — for any platform
  fetch,

  // Add custom provider at runtime
  // rabbit.addProvider("tiktok", { name, build, extract })
  addProvider(platform, provider) {
    if (!PROVIDERS[platform]) PROVIDERS[platform] = [];
    PROVIDERS[platform].push(provider);
  },

  // Register a completely new platform with providers
  // rabbit.register("tiktok", [...providers])
  register(platform, providers) {
    PROVIDERS[platform] = providers;
  },

  // List all available platforms
  platforms: () => Object.keys(PROVIDERS),
};

module.exports = rabbit;
