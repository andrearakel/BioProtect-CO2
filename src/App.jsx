// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import Header from "./components/Header";
import TripForm from "./components/TripForm";
import TripTable from "./components/TripTable";
import CO2Chart from "./components/CO2Chart";
import {
  loadBoats,
  saveBoats,
  getSelectedBoatId,
  setSelectedBoatId,
} from "./lib/storage";

export default function App() {
  const [boats, setBoats] = useState(() => loadBoats());
  const [selectedBoatId, setSelId] = useState(() => getSelectedBoatId());

  // ✅ shared filter for BOTH chart + table
  const [speciesFilter, setSpeciesFilter] = useState("all");

  // save boats to localStorage whenever they change
  useEffect(() => {
    saveBoats(boats);
  }, [boats]);

  const selectedBoat = useMemo(
    () => boats.find((b) => b.id === selectedBoatId) || null,
    [boats, selectedBoatId]
  );

  const handleAddBoat = () => {
    const name = window.prompt("Boat name?");
    if (!name) return;
    const gear = window.prompt("Gear type?");
    const newBoat = {
      id: String(Date.now()),
      name: name.trim(),
      gear: (gear || "").trim(),
      trips: [],
    };
    const updated = [...boats, newBoat];
    setBoats(updated);
    setSelId(newBoat.id);
    setSelectedBoatId(newBoat.id);

    // optional: reset filter when switching boats
    setSpeciesFilter("all");
  };

  const handleSelectBoat = (id) => {
    setSelId(id);
    setSelectedBoatId(id);

    // optional: reset filter when switching boats
    setSpeciesFilter("all");
  };

  const handleSaveTrip = (trip) => {
    if (!selectedBoat) return;

    // ensure species exists (backwards-safe)
    const safeTrip = { ...trip, species: trip.species ?? "unknown" };

    const updated = boats.map((b) =>
      b.id === selectedBoat.id ? { ...b, trips: [...b.trips, safeTrip] } : b
    );
    setBoats(updated);
  };

  return (
    <div className="app-shell">
      <Header
        boats={boats}
        selectedBoatId={selectedBoatId}
        selectedBoat={selectedBoat}
        onAddBoat={handleAddBoat}
        onSelectBoat={handleSelectBoat}
      />

      <main className="content">
        <section className="left">
          <TripForm boat={selectedBoat} onSaveTrip={handleSaveTrip} />

          <TripTable
            trips={selectedBoat?.trips || []}
            speciesFilter={speciesFilter}
          />
        </section>

        <aside className="right">
          <CO2Chart
            trips={selectedBoat?.trips || []}
            speciesFilter={speciesFilter}
            onSpeciesFilterChange={setSpeciesFilter}
          />
        </aside>
      </main>
    </div>
  );
}
