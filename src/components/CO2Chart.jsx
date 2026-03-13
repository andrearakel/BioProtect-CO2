// src/components/CO2Chart.jsx
import { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const PAGE_SIZE = 10;

const SPECIES = [
  { id: "cod", label: "Cod", color: "#2563eb" },
  { id: "haddock", label: "Haddock", color: "#10b981" },
  { id: "saithe", label: "Saithe", color: "#f59e0b" },
  { id: "redfish", label: "Redfish", color: "#ef4444" },
  { id: "other", label: "Other", color: "#6b7280" },
  { id: "herring", label: "Herring", color: "#8b5cf6" },
  { id: "blue_whiting", label: "Blue Whiting", color: "#06b6d4" },
  { id: "mackerel", label: "Mackerel", color: "#84cc16" },
  { id: "capelin", label: "Capelin", color: "#f97316" },
];
const SPECIES_LABELS = Object.fromEntries(SPECIES.map((s) => [s.id, s.label]));

const nf2 = new Intl.NumberFormat("is-IS", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtNum(n) {
  return typeof n === "number" && isFinite(n) ? nf2.format(n) : "—";
}

function computeBreakdownShares(t) {
  // preferred: new format
  if (Array.isArray(t.speciesBreakdown) && t.speciesBreakdown.length) {
    const cleaned = t.speciesBreakdown
      .map((r) => ({
        species: r?.species || "unknown",
        catchKg: Number(r?.catchKg) || 0,
      }))
      .filter((r) => r.catchKg > 0);

    const totalCatch = cleaned.reduce((acc, r) => acc + r.catchKg, 0);
    if (totalCatch <= 0) return { totalCatch: 0, shares: {} };

    const shares = {};
    for (const r of cleaned) {
      shares[r.species] = (shares[r.species] || 0) + r.catchKg / totalCatch;
    }
    return { totalCatch, shares };
  }

  // backwards compatibility: old trips
  const catchKg = asNum(t.catch) || 0;
  const sp = t.species || "unknown";
  if (!catchKg) return { totalCatch: 0, shares: {} };
  return { totalCatch: catchKg, shares: { [sp]: 1 } };
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  // payload contains multiple stacked series for the same xKey
  const entry = payload[0]?.payload || {};
  const [date, time] = String(label || "").split("|");
  const header = time ? `${date} ${time}` : date;

  // species parts from entry
  const speciesLines = SPECIES.map((s) => {
    const key = `${s.id}_part`;
    const val = asNum(entry[key]) || 0;
    return { ...s, val };
  }).filter((x) => x.val > 0);

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 10,
        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
        minWidth: 260,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{header}</div>

      <div style={{ display: "grid", gap: 4, fontSize: 13, marginBottom: 10 }}>
        <div>
          <strong>Total:</strong> {fmtNum(entry.Total)} kg/kg
        </div>
        <div>Fuel: {fmtNum(entry.Fuel)} kg/kg</div>
        <div>Lubricant: {fmtNum(entry.Lubricant)} kg/kg</div>
        <div>Cooling: {fmtNum(entry.Cooling)} kg/kg</div>
      </div>

      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
        Split (allocated by catch share)
      </div>

      <div style={{ display: "grid", gap: 4, fontSize: 13 }}>
        {speciesLines.length ? (
          speciesLines.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                aria-hidden="true"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 9999,
                  background: s.color,
                  display: "inline-block",
                }}
              />
              <span style={{ flex: 1 }}>{s.label}</span>
              <span>{fmtNum(s.val)} kg/kg</span>
            </div>
          ))
        ) : (
          <div style={{ color: "#6b7280" }}>—</div>
        )}
      </div>
    </div>
  );
}

export default function CO2Chart({ trips = [] }) {
  const [page, setPage] = useState(0);

  // newest -> oldest
  const sorted = useMemo(
    () => [...trips].sort((a, b) => new Date(b?.dateIso || 0) - new Date(a?.dateIso || 0)),
    [trips]
  );

  const totalTrips = sorted.length;
  const startIdx = page * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, totalTrips);
  const pageSlice = sorted.slice(startIdx, endIdx);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(totalTrips / PAGE_SIZE) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [totalTrips, page]);

  const data = useMemo(() => {
    return pageSlice
      .map((t) => {
        const { totalCatch, shares } = computeBreakdownShares(t);
        if (!totalCatch) return null;

        const totalPerKg = asNum(t.co2PerKg); // saved kg/kg
        if (totalPerKg == null) return null;

        const diesel = asNum(t.dieselCO2);
        const lube = asNum(t.lubeCO2);
        const cooling = asNum(t.coolingCO2);

        const d = new Date(t.dateIso || Date.now());
        const dateOnly = isNaN(d.getTime()) ? (t.dateIso || "") : d.toLocaleDateString();
        const timeOnly = isNaN(d.getTime())
          ? ""
          : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        // build stacked parts: share * totalPerKg
        const parts = {};
        for (const s of SPECIES) {
          const share = shares[s.id] || 0;
          parts[`${s.id}_part`] = share * totalPerKg;
        }

        // if trip includes unknown species, we can optionally show it:
        // For now: ignore unknown in chart (still counted in Total). If you want, we can add an "Unknown" series.
        // This keeps the legend stable with the 5 client-request species.

        // However, if shares include species not in SPECIES, the stacked sum would be < Total.
        // To keep the stack equal to Total, we add "other_part" if needed.
const knownShare = SPECIES.reduce((acc, s) => acc + (shares[s.id] || 0), 0);
const unknownShare = Math.max(0, 1 - knownShare);
parts.unknown_part = unknownShare * totalPerKg;

        return {
          xKey: `${dateOnly}|${timeOnly}`,
          sortKey: d.getTime() || 0,

          // totals (for tooltip)
          Total: totalPerKg,
          Fuel: diesel == null ? null : diesel / totalCatch,
          Lubricant: lube == null ? null : lube / totalCatch,
          Cooling: cooling == null ? null : cooling / totalCatch,

          // stacked series
          ...parts,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.sortKey - a.sortKey); // newest left
  }, [pageSlice]);

  if (!totalTrips) {
    return (
      <div className="card chart-card" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="muted">No trips yet to chart.</div>
      </div>
    );
  }

  return (
    <div className="card chart-card" style={{ overflow: "visible" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
          ⟨ Newer
        </button>
        <div className="muted" style={{ fontSize: 12 }}>
          Showing trips {startIdx + 1}–{endIdx} of {totalTrips}
        </div>
        <button onClick={() => setPage((p) => (endIdx >= totalTrips ? p : p + 1))} disabled={endIdx >= totalTrips}>
          Older ⟩
        </button>
      </div>

      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barCategoryGap={20}
            barSize={26}
            margin={{ top: 20, right: 24, bottom: 35, left: 44 }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="xKey"
              interval={0}
              tick={{ fontSize: 12 }}
              height={36}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => String(v).split("|")[0]}
            />

            <YAxis
              width={72}
              domain={[0, "auto"]}
              tickFormatter={(v) => (typeof v === "number" ? nf2.format(v) : v)}
              label={{
                value: "kg CO₂-eq per kg catch",
                angle: -90,
                position: "insideLeft",
                dy: 58,
                style: { fill: "#6b7280", fontSize: 13 },
              }}
            />

            <Tooltip
              labelFormatter={(v) => {
                const [date, time] = String(v).split("|");
                return time ? `${date} ${time}` : date;
              }}
              content={<CustomTooltip />}
            />

            <Legend verticalAlign="bottom" height={18} />

            {/* ✅ Vertical stacking by species share (share * Total kg/kg) */}
            {SPECIES.map((s) => (
              <Bar
                key={s.id}
                dataKey={`${s.id}_part`}
                name={s.label}
                stackId="a"
                fill={s.color}
                isAnimationActive={false}
              />
            ))}

            {/* Keep stack matching Total if "other" species present */}
<Bar
  dataKey="unknown_part"
  name="Unknown"
  stackId="a"
  fill="#9ca3af"
  radius={[6, 6, 0, 0]}
  isAnimationActive={false}
/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
        Bars show <strong>total</strong> CO₂ intensity (kg CO₂-eq/kg catch). Colors show the{" "}
        <strong>catch-share allocation</strong> across species within each trip.
      </div>
    </div>
  );
}
