// src/components/CO2Chart.jsx
import { useMemo, useState } from "react";
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
import { calculateEmissions } from "../lib/calc";

const PAGE_SIZE = 10;

export default function CO2Chart({ trips = [] }) {
  // newest -> oldest globally
  const sorted = useMemo(
    () => [...trips].sort((a, b) => new Date(b?.dateIso || 0) - new Date(a?.dateIso || 0)),
    [trips]
  );

  const [page, setPage] = useState(0);
  const total = sorted.length;
  const startIdx = page * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, total);
  const pageSlice = sorted.slice(startIdx, endIdx);

  // Build chart data (no early rounding)
  const data = useMemo(() => {
    return pageSlice
      .map((t) => {
        const catchKg = Number(t.catch) || 0;
        if (!catchKg) return null;

        const lubeL = parseFloat(String(t.lubricant || "").replace(" L", "")) || 0;
        const r = calculateEmissions({
          fuel_L: Number(t.fuel) || 0,
          catch_kg: catchKg,
          lube_L: lubeL || null,
          coolant_type: t.coolant_type || "R717",
          coolant_L: t.coolant_L === "" || t.coolant_L == null ? null : Number(t.coolant_L),
        });

        const d = new Date(t.dateIso || Date.now());
        const dateOnly = isNaN(d.getTime()) ? (t.dateIso || "") : d.toLocaleDateString();
        const timeOnly = isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const fullTs   = isNaN(d.getTime()) ? (t.dateIso || "") : d.toLocaleString();

        return {
          // unique categorical key; tick will only show the left side
          xKey: `${dateOnly}|${timeOnly}`,
          dateOnly,
          fullTs,
          sortKey: d.getTime() || 0,
          Fuel: r.dieselCO2 / catchKg,
          Lubricant: r.lubeCO2 / catchKg,
          Cooling: r.coolingCO2 / catchKg,
        };
      })
      .filter(Boolean)
      // newest on the LEFT
      .sort((a, b) => b.sortKey - a.sortKey);
  }, [pageSlice]);

  if (!total) {
    return (
      <div className="card chart-card" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="muted">No trips yet to chart.</div>
      </div>
    );
  }

  return (
    <div className="card chart-card" style={{ overflow: "visible" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: ".5rem" }}>
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>⟨ Newer</button>
        <div className="muted" style={{ fontSize: 12 }}>
          Showing trips {startIdx + 1}–{endIdx} of {total}
        </div>
        <button onClick={() => setPage((p) => (endIdx >= total ? p : p + 1))} disabled={endIdx >= total}>Older ⟩</button>
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

            {/* CATEGORICAL axis with unique keys; render only the date part */}
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
              tickFormatter={(v) => (typeof v === "number" ? v.toFixed(3) : v)}
              label={{
                value: "kg CO₂-eq per kg catch",
                angle: -90,
                position: "insideLeft",
                dy: 58,
                style: { fill: "#6b7280", fontSize: 13 },
              }}
            />

            <Tooltip
              // show full timestamp in header
              labelFormatter={(v) => {
                const [date, time] = String(v).split("|");
                return time ? `${date} ${time}` : date;
              }}
              formatter={(val, name) => [
                typeof val === "number" ? `${val.toFixed(4)} kg/kg` : val,
                name,
              ]}
            />

            <Legend verticalAlign="bottom" height={18} />

            <Bar dataKey="Fuel"      stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Lubricant" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Cooling"   stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
