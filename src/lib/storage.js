// src/lib/storage.js
const BOATS_KEY = "boats";
const SELECTED_BOAT_KEY = "selectedBoatId";

export function loadBoats() {
  try {
    const raw = localStorage.getItem(BOATS_KEY);
    if (!raw) return [];

    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];

    // ✅ Normalize: ensure every trip has a species (backwards compatible)
    return arr.map((boat) => ({
      ...boat,
      trips: (boat.trips || []).map((trip) => ({
        ...trip,
        species: trip.species ?? "unknown",
      })),
    }));
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
