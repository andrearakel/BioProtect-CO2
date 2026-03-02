// src/components/CO2Chart.jsx
import { useMemo, useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const PAGE_SIZE = 10;

const SPECIES_COLORS = {
  cod: "#2563eb",
  haddock: "#10b981",
  saithe: "#f59e0b",
  golden_redfish: "#ef4444",
  herring: "#8b5cf6",
  unknown: "#6b7280",
};

const SPECIES_LABELS = {
  cod: "Cod",
  haddock: "Haddock",
  saithe: "Saithe",
  golden_redfish: "Golden redfish",
  herring: "Herring",
  unknown: "Unknown",
};

// ✅ Icelandic formatting, 2 decimals (so 106.42 becomes 106,42)
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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const entry = payload[0]?.payload || {};
  const [date, time] = String(label || "").split("|");
  const header = time ? `${date} ${time}` : date;

  const speciesKey = entry.species || "unknown";
  const speciesLabel = SPECIES_LABELS[speciesKey] || "Unknown";

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 10,
        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
        minWidth: 220,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{header}</div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          fontSize: 12,
          color: "#6b7280",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 10,
            height: 10,
            borderRadius: 9999,
            background: SPECIES_COLORS[speciesKey] || SPECIES_COLORS.unknown,
            display: "inline-block",
          }}
        />
        <span>Species: {speciesLabel}</span>
      </div>

      <div style={{ display: "grid", gap: 4, fontSize: 13 }}>
        <div>
          <strong>Total:</strong> {fmtNum(entry.Total)} kg/kg
        </div>
        <div>Fuel: {fmtNum(entry.Fuel)} kg/kg</div>
        <div>Lubricant: {fmtNum(entry.Lubricant)} kg/kg</div>
        <div>Cooling: {fmtNum(entry.Cooling)} kg/kg</div>
      </div>
    </div>
  );
}

export default function CO2Chart({
  trips = [],
  speciesFilter = "all",
  onSpeciesFilterChange,
}) {
  const [page, setPage] = useState(0);

  // newest -> oldest globally
  const sorted = useMemo(
    () =>
      [...trips].sort(
        (a, b) => new Date(b?.dateIso || 0) - new Date(a?.dateIso || 0)
      ),
    [trips]
  );

  // Filter BEFORE pagination
  const filtered = useMemo(() => {
    if (speciesFilter === "all") return sorted;
    return sorted.filter((t) => (t.species || "unknown") === speciesFilter);
  }, [sorted, speciesFilter]);

  // reset to first page when filter changes
  useEffect(() => {
    setPage(0);
  }, [speciesFilter]);

  const total = filtered.length;
  const startIdx = page * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, total);
  const pageSlice = filtered.slice(startIdx, endIdx);

  // clamp page if list shrinks
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [total, page]);

  /**
   * IMPORTANT:
   * Use SAVED trip results to match TripTable + y-axis label.
   * Total is co2PerKg (kg/kg). Breakdown per kg uses saved component totals / catch.
   */
  const data = useMemo(() => {
    return pageSlice
      .map((t) => {
        const catchKg = asNum(t.catch) || 0;
        if (!catchKg) return null;

        const totalPerKg = asNum(t.co2PerKg); // already kg/kg (saved)
        if (totalPerKg == null) return null;

        const diesel = asNum(t.dieselCO2);
        const lube = asNum(t.lubeCO2);
        const cooling = asNum(t.coolingCO2);

        const d = new Date(t.dateIso || Date.now());
        const dateOnly = isNaN(d.getTime())
          ? t.dateIso || ""
          : d.toLocaleDateString();
        const timeOnly = isNaN(d.getTime())
          ? ""
          : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        return {
          xKey: `${dateOnly}|${timeOnly}`,
          sortKey: d.getTime() || 0,
          species: t.species || "unknown",

          // kg/kg
          Total: totalPerKg,
          Fuel: diesel == null ? null : diesel / catchKg,
          Lubricant: lube == null ? null : lube / catchKg,
          Cooling: cooling == null ? null : cooling / catchKg,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.sortKey - a.sortKey); // newest left
  }, [pageSlice]);

  if (!sorted.length) {
    return (
      <div
        className="card chart-card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="muted">No trips yet to chart.</div>
      </div>
    );
  }

  return (
    <div className="card chart-card" style={{ overflow: "visible" }}>
      {/* Filter row */}
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: ".6rem",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="muted" style={{ fontSize: 12 }}>
            Species
          </div>

          <select
            value={speciesFilter}
            onChange={(e) => onSpeciesFilterChange?.(e.target.value)}
            style={{
              height: 32,
              padding: "4px 10px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 13,
              background: "white",
            }}
          >
            <option value="all">All species</option>
            <option value="cod">Cod</option>
            <option value="haddock">Haddock</option>
            <option value="saithe">Saithe</option>
            <option value="golden_redfish">Golden redfish</option>
            <option value="herring">Herring</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div className="muted" style={{ fontSize: 12 }}>
          Showing trips {total ? startIdx + 1 : 0}–{endIdx} of {total}
          {speciesFilter !== "all"
            ? ` (${SPECIES_LABELS[speciesFilter] || speciesFilter})`
            : ""}
        </div>
      </div>

      {/* Pagination row */}
      <div
        className="row"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: ".5rem",
        }}
      >
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          ⟨ Newer
        </button>
        <button
          onClick={() => setPage((p) => (endIdx >= total ? p : p + 1))}
          disabled={endIdx >= total}
        >
          Older ⟩
        </button>
      </div>

      {total === 0 ? (
        <div className="muted" style={{ padding: "0.75rem 0.25rem" }}>
          No trips match that species yet.
        </div>
      ) : (
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
                tickFormatter={(v) =>
                  typeof v === "number" ? nf2.format(v) : v
                }
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

              <Legend
                verticalAlign="bottom"
                height={18}
                formatter={(value) =>
                  value === "Total" ? "Total (colored by species)" : value
                }
              />

              <Bar dataKey="Total" name="Total" radius={[6, 6, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={
                      SPECIES_COLORS[entry.species] || SPECIES_COLORS.unknown
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
