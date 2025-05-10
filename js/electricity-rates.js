/**
 * Saudi Electricity Company (SEC) rate calculator
 * Calculates electricity rates based on consumption levels
 */

// SEC residential tariff structure (SAR per kWh)
const SEC_RATES = [
  { maxKwh: 2000, rate: 0.18 },  // Tier 1: 1-2000 kWh
  { maxKwh: 4000, rate: 0.24 },  // Tier 2: 2001-4000 kWh
  { maxKwh: 6000, rate: 0.30 },  // Tier 3: 4001-6000 kWh
  { maxKwh: Infinity, rate: 0.32 }  // Tier 4: 6001+ kWh
];

export function calculateElectricityRate(kwhUsage) {
  // Default rate if calculation fails
  const defaultRate = 0.18;
  
  if (!kwhUsage || isNaN(kwhUsage) || kwhUsage < 0) {
    return defaultRate;
  }
  // Find the appropriate tier based on usage
  for (const tier of SEC_RATES) {
    if (kwhUsage <= tier.maxKwh) {
      return tier.rate;
    }
  } 
  // If we somehow get here, return the highest tier rate
  return SEC_RATES[SEC_RATES.length - 1].rate;
}

export function calculateElectricityCost(kwhUsage) {
  if (!kwhUsage || isNaN(kwhUsage) || kwhUsage <= 0) {
    return 0;
  }
  let remainingKwh = kwhUsage;
  let totalCost = 0;
  let previousMax = 0;
  
  // Calculate cost for each tier
  for (const tier of SEC_RATES) {
    const tierKwh = Math.min(remainingKwh, tier.maxKwh - previousMax);
    if (tierKwh > 0) {
      totalCost += tierKwh * tier.rate;
      remainingKwh -= tierKwh;
      previousMax = tier.maxKwh;
      
      if (remainingKwh <= 0) break;
    }
  }
  return totalCost;
}
