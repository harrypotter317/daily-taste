const clientId = "00b0e4aa91f24367b748a34cddea824c";
const redirectUri = "https://harrypotter317.github.io/daily-taste/";
const scope = [
  "user-read-recently-played",
  "playlist-modify-public",
  "playlist-modify-private",
  "user-read-private"
].join(" ");

function buildAuthUrl() {
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "token");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("show_dialog", "true");
  return url.toString();
}

document.getElementById("loginBtn").onclick = () => {
  window.location.href = buildAuthUrl();
};

function getTokenFromHash() {
  if (!window.location.hash) return null;
  const hash = window.location.hash.substring(1).split("&").reduce((acc, cur) => {
    const [k, v] = cur.split("=");
    acc[k] = decodeURIComponent(v);
    return acc;
  }, {});
  return hash.access_token || null;
}

async function apiGet(url, token) {
  const res = await fetch(url, { headers: { Authorization: "Bearer " + token }});
  return res.json();
}

async function getRecentUris(token, limit = 50) {
  const r = await apiGet(`https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`, token);
  if (!r.items) return [];
  const seen = new Set();
  return r.items.map(i => i.track.uri).filter(uri => {
    if (seen.has(uri)) return false;
    seen.add(uri);
    return true;
  });
}

async function createPlaylistForToday(token, name, description = "") {
  const me = await apiGet("https://api.spotify.com/v1/me", token);
  const body = { name, description, public: false };
  const res = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function addTracksToPlaylist(token, playlistId, uris) {
  if (uris.length === 0) return;
  await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ uris })
  });
}

document.getElementById("genBtn").onclick = async () => {
  const status = document.getElementById("status");
  status.textContent = "Checking token...";
  const token = getTokenFromHash();
  if (!token) {
    status.textContent = "No token found. Click 'Log in with Spotify' first.";
    return;
  }
  status.textContent = "Fetching recent tracks...";
  const recent = await getRecentUris(token, 50);
  const count = Math.max(1, parseInt(document.getElementById("songCount").value || "20"));
  const selected = recent.slice(0, count);
  status.textContent = "Creating playlist...";
  const today = new Date().toISOString().split("T")[0];
  const playlist = await createPlaylistForToday(token, `DailyTaste ${today}`, "Auto-generated daily playlist");
  await addTracksToPlaylist(token, playlist.id, selected);
  status.textContent = `Done 🎧 ${selected.length} tracks added! Check Spotify!`;
};

(function cleanHash() {
  if (window.location.hash.includes("access_token")) {
    setTimeout(() => history.replaceState(null, "", window.location.pathname + window.location.search), 500);
  }
})();
