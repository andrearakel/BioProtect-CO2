// src/components/TripForm.jsx
import { useMemo, useState } from "react";
import { calculateEmissions } from "../lib/calc";

/** 5 common Iceland fisheries species (practical defaults for the app) */
const SPECIES_OPTIONS = [
  { id: "cod", label: "Cod" },
  { id: "haddock", label: "Haddock" },
  { id: "saithe", label: "Saithe" },
  { id: "golden_redfish", label: "Golden redfish" },
  { id: "herring", label: "Herring" },
];

function InfoTooltip({ text }) {
  return (
    <span
      style={{
        marginLeft: 6,
        cursor: "help",
        color: "#6b7280",
        fontSize: 13,
        lineHeight: "1",
      }}
      title={text}
    >
      ⓘ
    </span>
  );
}

function toNumOrNull(v) {
  if (v === "" || v == null) return null;
  // allow comma decimals just in case (some keyboards/browsers)
  const s = String(v).replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function TripForm({ boat, onSaveTrip }) {
  const [inputs, setInputs] = useState({
    fuel_L: "",
    lube_L: "",
    coolant_type: "R717", // "R717" | "R744"
    coolant_L: "",
  });

  // ✅ NEW: catch split by species (Option 2)
  const [speciesBreakdown, setSpeciesBreakdown] = useState([
    { species: "cod", catchKg: "" },
  ]);

  const [result, setResult] = useState(null);

  const controlStyle = {
    width: "100%",
    height: "36px",
    padding: "6px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
  };

  const totalCatchKg = useMemo(() => {
    const sum = speciesBreakdown.reduce((acc, row) => {
      const n = toNumOrNull(row.catchKg);
      return acc + (n && n > 0 ? n : 0);
    }, 0);
    return sum;
  }, [speciesBreakdown]);

  // Any change invalidates the current result (prevents saving stale calculations)
  const invalidate = () => setResult(null);

  const onChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value }));
    invalidate();
  };

  const updateRow = (idx, patch) => {
    setSpeciesBreakdown((prev) => {
      const next = prev.map((r, i) => (i === idx ? { ...r, ...patch } : r));
      return next;
    });
    invalidate();
  };

  const addRow = () => {
    setSpeciesBreakdown((prev) => [...prev, { species: "cod", catchKg: "" }]);
    invalidate();
  };

  const removeRow = (idx) => {
    setSpeciesBreakdown((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [{ species: "cod", catchKg: "" }];
    });
    invalidate();
  };

  const canCalculate = boat && totalCatchKg > 0;

  const onCalculate = () => {
    if (!canCalculate) return;

    const r = calculateEmissions({
      fuel_L: toNumOrNull(inputs.fuel_L),
      catch_kg: totalCatchKg,
      lube_L: inputs.lube_L === "" ? null : toNumOrNull(inputs.lube_L),
      coolant_type: inputs.coolant_type,
      coolant_L: inputs.coolant_L === "" ? null : toNumOrNull(inputs.coolant_L),
    });

    setResult(r);
  };

  const onSave = () => {
    if (!boat || !result) return;

    const cleanedBreakdown = speciesBreakdown
      .map((r) => ({
        species: r.species || "unknown",
        catchKg: toNumOrNull(r.catchKg) || 0,
      }))
      .filter((r) => r.catchKg > 0);

    const trip = {
      dateIso: new Date().toISOString(),

      // ✅ NEW: store catch split (client requirement)
      speciesBreakdown: cleanedBreakdown,

      // ✅ total catch derived from split (single source of truth)
      catch: totalCatchKg,

      // inputs kept for history / transparency
      fuel: inputs.fuel_L,
      lubricant: inputs.lube_L ? `${inputs.lube_L} L` : "",
      coolant_type: inputs.coolant_type,
      coolant_L: inputs.coolant_L === "" ? 0 : Number(String(inputs.coolant_L).replace(",", ".")),

      // calculated outputs
      ...result,
    };

    onSaveTrip(trip);

    // reset fields
    setInputs({
      fuel_L: "",
      lube_L: "",
      coolant_type: "R717",
      coolant_L: "",
    });
    setSpeciesBreakdown([{ species: "cod", catchKg: "" }]);
    setResult(null);
  };

  return (
    <div className="card">
      <h2>Trip Data {boat ? `(Boat: ${boat.name})` : "(Add a boat to begin)"}</h2>

      {/* ✅ Catch split by species (top) */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 600 }}>
            Catch split by species{" "}
            <span style={{ fontWeight: 400, color: "#6b7280", fontSize: 12 }}>
              (kg per species)
            </span>
          </div>

          <div style={{ color: "#6b7280", fontSize: 12 }}>
            Total catch: <strong>{totalCatchKg ? totalCatchKg.toFixed(1) : "0.0"} kg</strong>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {speciesBreakdown.map((row, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 140px 44px",
                gap: 8,
                alignItems: "center",
              }}
            >
              <select
                value={row.species}
                onChange={(e) => updateRow(idx, { species: e.target.value })}
                style={controlStyle}
              >
                {SPECIES_OPTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>

              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                placeholder="kg"
                value={row.catchKg}
                onChange={(e) => updateRow(idx, { catchKg: e.target.value })}
                style={controlStyle}
              />

              <button
                type="button"
                onClick={() => removeRow(idx)}
                title="Remove species"
                style={{
                  height: 36,
                  borderRadius: 8,
                  padding: "0 10px",
                  border: "1px solid #e5e7eb",
                  color: "white",
                  background: "#0f4a9cff",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))}

          <div>
            <button
              type="button"
              onClick={addRow}
              style={{
                height: 32,
                padding: "0 10px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#0f4a9cff",
                color: "white",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              + Add species
            </button>
          </div>
        </div>
      </div>

<div className="grid">
  {/* Row 1 */}
  <label>
    <span>Fuel (L)</span>
    <input
      type="number"
      name="fuel_L"
      value={inputs.fuel_L}
      onChange={onChange}
      min="0"
      step="0.1"
      style={controlStyle}
    />
  </label>

  <label>
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      Lubricant (L)
      <InfoTooltip text="Lubricant is normally replenished periodically rather than per trip. Enter the estimated amount attributable to this trip." />
    </span>
    <input
      type="number"
      name="lube_L"
      value={inputs.lube_L}
      onChange={onChange}
      min="0"
      step="0.1"
      placeholder="liters"
      style={controlStyle}
    />
  </label>

  {/* Row 2 */}
  <label>
    <span>Coolant type</span>
    <select
      name="coolant_type"
      value={inputs.coolant_type}
      onChange={onChange}
      style={controlStyle}
    >
      <option value="R717">R717 (Ammonia)</option>
      <option value="R744">R744 (CO₂)</option>
    </select>
  </label>

  <label>
    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
      Coolant (L)
      <InfoTooltip text="Coolant additions occur intermittently and not necessarily per trip. Enter the estimated amount allocated to this trip." />
    </span>
    <input
      type="number"
      name="coolant_L"
      value={inputs.coolant_L}
      onChange={onChange}
      min="0"
      step="0.1"
      placeholder="liters"
      style={controlStyle}
    />
  </label>
</div>


      <div className="row">
        <button onClick={onCalculate} disabled={!canCalculate}>
          Calculate
        </button>
        <button onClick={onSave} disabled={!result || !boat}>
          Save Trip
        </button>
      </div>

      {result && (
        <div className="result-box">
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <strong>Totals:</strong>
            <Badge>CO₂ total: {result.totalCO2} kg</Badge>
            <Badge>CO₂ per kg: {result.co2PerKg ?? "—"} kg/kg</Badge>
          </div>
          <div style={{ marginTop: ".5rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Badge tone="neutral">Diesel: {result.dieselCO2} kg</Badge>
            <Badge tone="neutral">Lube: {result.lubeCO2} kg</Badge>
            <Badge tone="neutral">Cooling: {result.coolingCO2} kg</Badge>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ children, tone = "success" }) {
  const style = {
    success: { background: "#e6f4ea", color: "#166534", border: "1px solid #bbf7d0" },
    warn: { background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa" },
    neutral: { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" },
  }[tone];

  return (
    <span
      style={{
        padding: "0.25rem 0.5rem",
        borderRadius: "9999px",
        fontSize: 12,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
