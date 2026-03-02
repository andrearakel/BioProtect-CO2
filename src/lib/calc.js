// src/lib/calc.js
export const FACTORS = {
  // Diesel: 0.0959 kg CO2e per MJ × 35.8 MJ/L
  diesel_kgCO2e_per_L: 3.4332,

  // Lube: 1.758 kg CO2e per kg, density ~0.89 kg/L
  lube_kgCO2e_per_kg: 1.758,
  lube_density_kg_per_L: 0.89,

  // Cooling (prototype: treating as per L of coolant, not per kg cooled)
  R717_per_L: 0.147, // Ammonia placeholder
  R744_per_L: 0.219, // CO2 placeholder
};

export function calculateEmissions({
  fuel_L,
  catch_kg,
  lube_L = null,
  coolant_type = "R717", // "R717" | "R744"
  coolant_L = null,
}) {
  const fuelNum = Number(fuel_L) || 0;

  // Diesel
  const dieselCO2 = fuelNum * FACTORS.diesel_kgCO2e_per_L;

  // Lube
  let lubeCO2 = 0;
  if (lube_L != null && lube_L !== "") {
    const lubeNum = Number(lube_L);
    if (Number.isFinite(lubeNum) && lubeNum > 0) {
      lubeCO2 =
        lubeNum *
        FACTORS.lube_density_kg_per_L *
        FACTORS.lube_kgCO2e_per_kg;
    }
  }

  // Cooling (per L, based on selected type)
  let coolingCO2 = 0;
  if (coolant_L != null && coolant_L !== "") {
    const coolNum = Number(coolant_L);
    if (Number.isFinite(coolNum) && coolNum > 0) {
      if (coolant_type === "R717") {
        coolingCO2 = coolNum * FACTORS.R717_per_L;
      } else if (coolant_type === "R744") {
        coolingCO2 = coolNum * FACTORS.R744_per_L;
      }
    }
  }

  // Total & intensity
  const totalCO2 = dieselCO2 + lubeCO2 + coolingCO2;

  const catchNum = Number(catch_kg);
  const co2PerKg =
    Number.isFinite(catchNum) && catchNum > 0 ? totalCO2 / catchNum : null;

  return {
    dieselCO2: round3(dieselCO2),
    lubeCO2: round3(lubeCO2),
    coolingCO2: round3(coolingCO2),
    totalCO2: round3(totalCO2),
    co2PerKg: round4OrNull(co2PerKg),
  };
}

const round3 = (n) => +Number(n || 0).toFixed(3);
const round4OrNull = (n) =>
  n == null ? null : +Number(n || 0).toFixed(4);
