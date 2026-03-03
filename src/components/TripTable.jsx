// src/components/TripTable.jsx
const SPECIES_LABELS = {
  cod: "Cod",
  haddock: "Haddock",
  saithe: "Saithe",
  golden_redfish: "Golden redfish",
  herring: "Herring",
  unknown: "Unknown",
};

function fmt2(n) {
  const num = Number(n);
  return Number.isFinite(num) ? num.toFixed(2) : "—";
}

function safeVal(v) {
  if (v === 0) return 0;
  if (v === "" || v == null) return "—";
  return v;
}

function normalizeBreakdown(t) {
  // New format
  if (Array.isArray(t.speciesBreakdown) && t.speciesBreakdown.length) {
    return t.speciesBreakdown
      .map((r) => ({
        species: r?.species || "unknown",
        catchKg: Number(r?.catchKg) || 0,
      }))
      .filter((r) => r.catchKg > 0);
  }

  // Backwards compatibility (old trips): if you had t.species + t.catch
  if (t.species && Number(t.catch) > 0) {
    return [{ species: t.species, catchKg: Number(t.catch) }];
  }

  return [];
}

function totalCatchFromBreakdown(bd) {
  return bd.reduce((acc, r) => acc + (Number(r.catchKg) || 0), 0);
}

function formatSpeciesMix(t) {
  const bd = normalizeBreakdown(t);
  if (!bd.length) return "—";

  const total = totalCatchFromBreakdown(bd);
  if (!total) return "—";

  // Combine duplicates (if user added same species twice)
  const merged = {};
  for (const r of bd) {
    merged[r.species] = (merged[r.species] || 0) + r.catchKg;
  }

  return Object.entries(merged)
    .sort((a, b) => b[1] - a[1]) // biggest first
    .map(([species, kg]) => {
      const pct = Math.round((kg / total) * 100);
      const label = SPECIES_LABELS[species] || species;
      return `${label}: ${kg.toFixed(1)} kg (${pct}%)`;
    })
    .join("; ");
}

export default function TripTable({ trips = [] }) {
  if (!trips.length) {
    return (
      <div className="card">
        <h3>Saved trips</h3>
        <div style={{ color: "#6b7280" }}>No trips saved yet.</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3>Saved trips</h3>

      <div style={{ overflowX: "auto" }}>
        <table className="table table-wide">
          <thead>
            <tr>
              <th>Date</th>
              <th>Species share</th>
              <th>Fuel (L)</th>
              <th>Lubricant (L)</th>
              <th>Coolant (L)</th>
              <th>Coolant type</th>
              <th>Total catch (kg)</th>
              <th>CO₂ total (kg)</th>
              <th>CO₂/kg</th>
            </tr>
          </thead>

          <tbody>
            {trips
              .slice() // ✅ don't mutate props
              .reverse()
              .map((t, idx) => {
                const d = new Date(t.dateIso || Date.now());
                const date = isNaN(d.getTime())
                  ? t.dateIso || ""
                  : d.toLocaleDateString();

                // Lubricant stored as "12 L" or ""
                const lubeL =
                  typeof t.lubricant === "string" &&
                  t.lubricant.trim().endsWith("L")
                    ? t.lubricant.replace(" L", "")
                    : t.lubricant ?? "";

                const coolantL = t.coolant_L ?? 0;
                const coolantType = t.coolant_type || "—";

                // Total catch: prefer breakdown sum if present, else t.catch
                const bd = normalizeBreakdown(t);
                const catchFromBreakdown = bd.length
                  ? totalCatchFromBreakdown(bd)
                  : null;

                const catchKg =
                  catchFromBreakdown != null
                    ? catchFromBreakdown
                    : Number(t.catch);

                return (
                  <tr key={idx}>
                    <td>{date}</td>
                    <td>{formatSpeciesMix(t)}</td>
                    <td>{safeVal(t.fuel)}</td>
                    <td>{safeVal(lubeL)}</td>
                    <td>
                      {Number.isFinite(Number(coolantL))
                        ? Number(coolantL).toFixed(1)
                        : "0.0"}
                    </td>
                    <td>{coolantType}</td>
                    <td>
                      {Number.isFinite(catchKg) ? catchKg.toFixed(1) : "—"}
                    </td>
                    <td>{fmt2(t.totalCO2)}</td>
                    <td>{fmt2(t.co2PerKg)}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
