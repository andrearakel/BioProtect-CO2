// src/components/TripForm.jsx
import { useState } from "react";
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
      title={text} // native browser tooltip
    >
      ⓘ
    </span>
  );
}

export default function TripForm({ boat, onSaveTrip }) {
  const [inputs, setInputs] = useState({
    species: "cod", // ✅ NEW (top row)
    fuel_L: "",
    catch_kg: "",
    lube_L: "",
    coolant_type: "R717", // "R717" | "R744"
    coolant_L: "", // liters added this trip
  });

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

  const onChange = (e) =>
    setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const num = (v) => (v === "" || v == null ? null : Number(v));

  const onCalculate = () => {
    const r = calculateEmissions({
      fuel_L: num(inputs.fuel_L),
      catch_kg: num(inputs.catch_kg),
      lube_L: inputs.lube_L === "" ? null : num(inputs.lube_L),

      // IMPORTANT: liters-based cooling (handled in calc.js with placeholders 0.147 / 0.219 per L)
      coolant_type: inputs.coolant_type,
      coolant_L: inputs.coolant_L === "" ? null : num(inputs.coolant_L),
    });
    setResult(r);
  };

  const onSave = () => {
    if (!boat || !result) return;

    const trip = {
      dateIso: new Date().toISOString(),

      // ✅ store species on trip (chart uses this)
      species: inputs.species || "unknown",

      fuel: inputs.fuel_L,
      lubricant: inputs.lube_L ? `${inputs.lube_L} L` : "",
      coolant_type: inputs.coolant_type,
      coolant_L: inputs.coolant_L === "" ? 0 : Number(inputs.coolant_L),
      catch: inputs.catch_kg,
      ...result,
    };

    onSaveTrip(trip);

    // reset fields
    setInputs({
      species: "cod",
      fuel_L: "",
      catch_kg: "",
      lube_L: "",
      coolant_type: "R717",
      coolant_L: "",
    });
    setResult(null);
  };

  return (
    <div className="card">
      <h2>Trip Data {boat ? `(Boat: ${boat.name})` : "(Add a boat to begin)"}</h2>

      {/* ✅ Species as first line (full width) */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block" }}>
          <span>Species</span>
          <select
            name="species"
            value={inputs.species}
            onChange={onChange}
            style={controlStyle}
          >
            {SPECIES_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Rest in grid */}
      <div className="grid">
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
          <span>Catch (kg)</span>
          <input
            type="number"
            name="catch_kg"
            value={inputs.catch_kg}
            onChange={onChange}
            min="0"
            step="1"
            style={controlStyle}
          />
        </label>

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
      </div>

      <div className="row">
        <button onClick={onCalculate} disabled={!boat}>
          Calculate
        </button>
        <button onClick={onSave} disabled={!result || !boat}>
          Save Trip
        </button>
      </div>

      {result && (
        <div className="result-box">
          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <strong>Totals:</strong>
            <Badge>CO₂ total: {result.totalCO2} kg</Badge>
            <Badge>CO₂ per kg: {result.co2PerKg} kg/kg</Badge>
          </div>
          <div
            style={{
              marginTop: ".5rem",
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
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
