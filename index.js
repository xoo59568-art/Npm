const API = "https://rabbitapi.nett.to";

async function get(endpoint, param, key = "url") {
  const res = await fetch(`${API}${endpoint}?${key}=${encodeURIComponent(param)}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const data = await res.json();
  if (!data.status && !data.success) throw new Error(data.error || "Failed");
  return data;
}

async function instagram(url) {
  return get("/api/insta", url);
}

async function facebook(url) {
  return get("/api/fb", url);
}

async function tiktok(url) {
  return get("/api/tiktok", url);
}

async function song(url) {
  return get("/api/song", url);
}

//
// async function youtube(url) {
//   return get("/api/youtube", url);
// }

module.exports = {
  instagram,
  facebook,
  tiktok,
  song,
};
