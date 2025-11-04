// ====== CONFIG ======
const redirectUri = "https://harrypotter317.github.io/daily-taste/daily.html";

// ====== UTILITY ======
function getTokenFromHash() {
  if (!window.location.hash) return null;
  const hash = window.location.hash.substring(1).split("&").reduce((acc, cur) => {
    const [k, v] = cur.split("=");
    acc[k] = decodeURIComponent(v);
    return acc;
  }, {});
  return hash.access_token || null;
}

// Clean the URL
(function cleanHash() {
  if (window.location.hash.includes("access_token")) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
})();

// ====== DOM ELEMENTS ======
const genBtn = document.getElementById("genBtn");
const songCountInput = document.getElementById("songCount");
const status = document.getElementById("status");

const token = getTokenFromHash();

if (token) {
  status.textContent = "Logged in! You can now generate your daily playlist 🎧";
  genBtn.disabled = false;
} else {
  status.textContent = "No token found. Please log in again from the main page.";
  genBtn.disabled = true;
}

// ====== API HELPERS ======
async function apiGet(url) {
  const res = await fetch(url, { headers: { Authorization: "Bearer " + token }});
  return res.json();
}

async function getRecentUris(limit = 50) {
  const r = await apiGet(`https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`);
  if (!r.items) return [];
  const seen = new Set();
  return r.items.map(i => i.track.uri).filter(uri => {
    if (seen.has(uri)) return false;
    seen.add(uri);
    return true;
  });
}

async function createPlaylistForToday(name, description = "") {
  const me = await apiGet("https://api.spotify.com/v1/me");
  const body = { name, description, public: false };
  const res = await fetch(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function addTracksToPlaylist(playlistId, uris) {
  if (!uris.length) return;
  await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify({ uris })
  });
}

// ====== GENERATE DAILY PLAYLIST ======
genBtn.onclick = async () => {
  status.textContent = "Fetching recent tracks...";
  const recent = await getRecentUris(50);

  const count = Math.max(1, parseInt(songCountInput.value || "20"));
  const selected = recent.slice(0, count);

  status.textContent = "Creating playlist...";
  const today = new Date().toISOString().split("T")[0];
  const playlist = await createPlaylistForToday(`DailyTaste ${today}`, "Auto-generated daily playlist");

  await addTracksToPlaylist(playlist.id, selected);
  status.textContent = `Done 🎧 ${selected.length} tracks added! Check Spotify!`;
};
