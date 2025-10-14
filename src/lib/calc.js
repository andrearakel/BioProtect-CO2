// src/lib/calc.js
export const FACTORS = {
  // Diesel: 0.0959 kg CO2e per MJ × 35.8 MJ/L
  diesel_kgCO2e_per_L: 3.4332,

  // Lube: 1.758 kg CO2e per kg, density ~0.89 kg/L
  lube_kgCO2e_per_kg: 1.758,
  lube_density_kg_per_L: 0.89,

  // Cooling (prototype: treating as per L of coolant, not per kg cooled)
  R717_per_L: 0.147,  // Ammonia placeholder
  R744_per_L: 0.219,  // CO2 placeholder
};

/**
 * Calculate emissions for a trip
 * - Fuel (L) required
 * - Catch (kg) required
 * - Lube in liters (optional)
 * - Coolant in liters (optional, type R717/R744)
 */
export function calculateEmissions({
  fuel_L,
  catch_kg,
  lube_L = null,
  coolant_type = "R717",  // "R717" | "R744"
  coolant_L = null,
}) {
  // Diesel
  const dieselCO2 = (fuel_L || 0) * FACTORS.diesel_kgCO2e_per_L;

  // Lube
  let lubeCO2 = 0;
  if (lube_L != null && lube_L !== "") {
    lubeCO2 =
      Number(lube_L) *
      FACTORS.lube_density_kg_per_L *
      FACTORS.lube_kgCO2e_per_kg;
  }

  // Cooling (per L, based on selected type)
  let coolingCO2 = 0;
  if (coolant_L != null && coolant_L !== "") {
    if (coolant_type === "R717") {
      coolingCO2 = Number(coolant_L) * FACTORS.R717_per_L;
    } else if (coolant_type === "R744") {
      coolingCO2 = Number(coolant_L) * FACTORS.R744_per_L;
    }
  }

  // Total & intensity
  const totalCO2 = dieselCO2 + lubeCO2 + coolingCO2;
  const co2PerKg = totalCO2 / Math.max(Number(catch_kg) || 0, 1);

  return {
    dieselCO2: round3(dieselCO2),
    lubeCO2: round3(lubeCO2),
    coolingCO2: round3(coolingCO2),
    totalCO2: round3(totalCO2),
    co2PerKg: round4(co2PerKg),
  };
}

const round3 = (n) => +Number(n || 0).toFixed(3);
const round4 = (n) => +Number(n || 0).toFixed(4);
