// src/components/TripTable.jsx
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
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Fuel (L)</th>
              <th>Lube (L)</th>
              <th>Coolant (L)</th>
              <th>Coolant type</th>
              <th>Catch (kg)</th>
              <th>CO₂ total (kg)</th>
              <th>CO₂/kg</th>
            </tr>
          </thead>
          <tbody>
            {trips.reverse().map((t, idx) => {
              const d = new Date(t.dateIso || Date.now());
              const date = isNaN(d.getTime()) ? (t.dateIso || "") : d.toLocaleDateString();

              // Lube is stored as "12 L" or ""
              const lubeL =
                typeof t.lubricant === "string" && t.lubricant.trim().endsWith("L")
                  ? t.lubricant.replace(" L", "")
                  : (t.lubricant ?? "");

              // Coolant: show 0 if absent (we now always save a number)
              const coolantL = (t.coolant_L ?? 0);
              const coolantType = t.coolant_type || "—";

              return (
                <tr key={idx}>
                  <td>{date}</td>
                  <td>{safeVal(t.fuel)}</td>
                  <td>{safeVal(lubeL)}</td>
                  <td>{Number.isFinite(Number(coolantL)) ? Number(coolantL) : 0}</td>
                  <td>{coolantType}</td>
                  <td>{safeVal(t.catch)}</td>
                  <td>{fmt(t.totalCO2)}</td>
                  <td>{fmt(t.co2PerKg)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(n) {
  const num = Number(n);
  return Number.isFinite(num) ? num.toFixed(3) : "—";
}
function safeVal(v) {
  if (v === 0) return 0;
  if (v === "" || v == null) return "—";
  return v;
}
