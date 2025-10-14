const BOATS_KEY = "boats";
const SELECTED_BOAT_KEY = "selectedBoatId";

export function loadBoats() {
  try {
    const raw = localStorage.getItem(BOATS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveBoats(boats) {
  localStorage.setItem(BOATS_KEY, JSON.stringify(boats));
}

export function getSelectedBoatId() {
  return localStorage.getItem(SELECTED_BOAT_KEY);
}

export function setSelectedBoatId(id) {
  if (id) localStorage.setItem(SELECTED_BOAT_KEY, id);
}