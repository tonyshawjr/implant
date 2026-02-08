/**
 * Territory Demographics Utilities
 * Provides estimated demographic data for territories
 *
 * Note: This uses mock/estimated data for now.
 * In production, this would integrate with Census API, demographic data providers,
 * or a pre-populated database of demographic information by ZIP code/geography.
 */

export interface DemographicEstimate {
  population: number;
  households: number;
  medianAge: number;
  medianHouseholdIncome: number;
  implantCandidates: number;
  competitorDensity: number;
  marketScore: number;
}

export interface DetailedDemographics extends DemographicEstimate {
  ageDistribution: {
    under18: number;
    age18to34: number;
    age35to54: number;
    age55to74: number;
    age75plus: number;
  };
  incomeDistribution: {
    under50k: number;
    income50kto100k: number;
    income100kto150k: number;
    over150k: number;
  };
  insuranceRate: number;
  dentalVisitRate: number;
  estimatedMarketSize: number;
}

// Average US demographic values for baseline calculations
const US_AVERAGES = {
  populationDensityPerSqMile: 94,
  medianAge: 38.5,
  medianHouseholdIncome: 74580,
  avgHouseholdSize: 2.53,
  dentalImplantCandidateRate: 0.065, // ~6.5% of adults are candidates
  dentalInsuranceRate: 0.77, // 77% have some dental coverage
  annualDentalVisitRate: 0.64 // 64% visit dentist annually
};

// Regional modifiers for more realistic estimates
const REGIONAL_MODIFIERS: Record<string, {
  populationMultiplier: number;
  incomeMultiplier: number;
  ageOffset: number;
}> = {
  // Northeast
  'CT': { populationMultiplier: 7.5, incomeMultiplier: 1.25, ageOffset: 2 },
  'MA': { populationMultiplier: 8.5, incomeMultiplier: 1.20, ageOffset: 1 },
  'NJ': { populationMultiplier: 12, incomeMultiplier: 1.15, ageOffset: 0 },
  'NY': { populationMultiplier: 4.5, incomeMultiplier: 1.10, ageOffset: 0 },
  'PA': { populationMultiplier: 2.8, incomeMultiplier: 0.95, ageOffset: 2 },
  'RI': { populationMultiplier: 10, incomeMultiplier: 0.95, ageOffset: 2 },

  // Southeast
  'FL': { populationMultiplier: 4, incomeMultiplier: 0.85, ageOffset: 8 },
  'GA': { populationMultiplier: 1.8, incomeMultiplier: 0.90, ageOffset: -2 },
  'NC': { populationMultiplier: 2, incomeMultiplier: 0.85, ageOffset: 0 },
  'SC': { populationMultiplier: 1.7, incomeMultiplier: 0.80, ageOffset: 1 },
  'VA': { populationMultiplier: 2, incomeMultiplier: 1.05, ageOffset: 0 },

  // Midwest
  'IL': { populationMultiplier: 2.2, incomeMultiplier: 0.95, ageOffset: 0 },
  'IN': { populationMultiplier: 1.8, incomeMultiplier: 0.85, ageOffset: 0 },
  'MI': { populationMultiplier: 1.8, incomeMultiplier: 0.85, ageOffset: 1 },
  'MN': { populationMultiplier: 0.7, incomeMultiplier: 1.00, ageOffset: 0 },
  'OH': { populationMultiplier: 2.8, incomeMultiplier: 0.85, ageOffset: 1 },
  'WI': { populationMultiplier: 1.1, incomeMultiplier: 0.90, ageOffset: 1 },

  // Southwest
  'AZ': { populationMultiplier: 0.6, incomeMultiplier: 0.85, ageOffset: 4 },
  'NM': { populationMultiplier: 0.2, incomeMultiplier: 0.75, ageOffset: 0 },
  'TX': { populationMultiplier: 1.1, incomeMultiplier: 0.90, ageOffset: -3 },
  'OK': { populationMultiplier: 0.6, incomeMultiplier: 0.75, ageOffset: 0 },

  // West
  'CA': { populationMultiplier: 2.5, incomeMultiplier: 1.15, ageOffset: -2 },
  'CO': { populationMultiplier: 0.5, incomeMultiplier: 1.05, ageOffset: -3 },
  'NV': { populationMultiplier: 0.3, incomeMultiplier: 0.90, ageOffset: 0 },
  'OR': { populationMultiplier: 0.4, incomeMultiplier: 0.90, ageOffset: 1 },
  'WA': { populationMultiplier: 1.1, incomeMultiplier: 1.05, ageOffset: -2 },
  'UT': { populationMultiplier: 0.4, incomeMultiplier: 0.90, ageOffset: -8 }
};

// Default modifier for states not in the list
const DEFAULT_MODIFIER = { populationMultiplier: 1.0, incomeMultiplier: 1.0, ageOffset: 0 };

/**
 * Estimate demographics for a territory based on location and radius
 *
 * @param lat - Center latitude
 * @param lng - Center longitude
 * @param radiusMiles - Radius in miles
 * @param stateCode - Optional state code for regional adjustments
 * @returns Estimated demographic data
 */
export function estimateDemographics(
  lat: number,
  lng: number,
  radiusMiles: number,
  stateCode?: string
): DemographicEstimate {
  // Calculate area in square miles
  const areaSqMiles = Math.PI * radiusMiles * radiusMiles;

  // Get regional modifier
  const modifier = stateCode
    ? REGIONAL_MODIFIERS[stateCode.toUpperCase()] || DEFAULT_MODIFIER
    : DEFAULT_MODIFIER;

  // Estimate population based on area and population density
  // Add some randomness for realism (seeded by lat/lng for consistency)
  const seed = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453) % 1;
  const densityVariation = 0.7 + (seed * 0.6); // 70% to 130% of base

  const baseDensity = US_AVERAGES.populationDensityPerSqMile * modifier.populationMultiplier * densityVariation;
  const population = Math.round(areaSqMiles * baseDensity);

  // Estimate households
  const households = Math.round(population / US_AVERAGES.avgHouseholdSize);

  // Estimate median age with regional adjustment
  const ageVariation = (seed - 0.5) * 4; // +/- 2 years
  const medianAge = US_AVERAGES.medianAge + modifier.ageOffset + ageVariation;

  // Estimate median household income with regional adjustment
  const incomeVariation = 0.9 + (seed * 0.2); // 90% to 110%
  const medianHouseholdIncome = Math.round(
    US_AVERAGES.medianHouseholdIncome * modifier.incomeMultiplier * incomeVariation
  );

  // Estimate implant candidates (adults 45+ with missing teeth or dental issues)
  // Higher income areas tend to have higher dental care awareness
  const incomeBoost = medianHouseholdIncome > 75000 ? 1.15 : medianHouseholdIncome > 50000 ? 1.0 : 0.85;
  const ageBoost = medianAge > 45 ? 1.2 : medianAge > 40 ? 1.0 : 0.8;
  const adultPopulation = population * 0.77; // ~77% are adults
  const implantCandidates = Math.round(
    adultPopulation * US_AVERAGES.dentalImplantCandidateRate * incomeBoost * ageBoost
  );

  // Estimate competitor density (competitors per 10,000 population)
  // Higher in urban areas (higher population density)
  const competitorDensity = Math.min(
    baseDensity / US_AVERAGES.populationDensityPerSqMile * 2,
    5
  );

  // Calculate market score (0-100)
  const marketScore = calculateMarketScore({
    population,
    medianHouseholdIncome,
    medianAge,
    implantCandidates,
    competitorDensity
  });

  return {
    population,
    households,
    medianAge: Math.round(medianAge * 10) / 10,
    medianHouseholdIncome,
    implantCandidates,
    competitorDensity: Math.round(competitorDensity * 10) / 10,
    marketScore
  };
}

/**
 * Get detailed demographics with age and income distribution breakdowns
 */
export function getDetailedDemographics(
  lat: number,
  lng: number,
  radiusMiles: number,
  stateCode?: string
): DetailedDemographics {
  const basic = estimateDemographics(lat, lng, radiusMiles, stateCode);

  // Estimate age distribution based on median age
  const ageOffset = (basic.medianAge - US_AVERAGES.medianAge) / 10;
  const ageDistribution = {
    under18: Math.max(0.15, 0.22 - ageOffset * 0.03),
    age18to34: Math.max(0.12, 0.21 - ageOffset * 0.02),
    age35to54: 0.25,
    age55to74: Math.max(0.15, 0.20 + ageOffset * 0.02),
    age75plus: Math.max(0.05, 0.12 + ageOffset * 0.03)
  };

  // Normalize to 100%
  const ageTotal = Object.values(ageDistribution).reduce((a, b) => a + b, 0);
  Object.keys(ageDistribution).forEach(key => {
    ageDistribution[key as keyof typeof ageDistribution] /= ageTotal;
  });

  // Estimate income distribution based on median income
  const incomeRatio = basic.medianHouseholdIncome / US_AVERAGES.medianHouseholdIncome;
  const incomeDistribution = {
    under50k: Math.max(0.15, 0.35 - (incomeRatio - 1) * 0.15),
    income50kto100k: 0.30,
    income100kto150k: Math.max(0.10, 0.20 + (incomeRatio - 1) * 0.08),
    over150k: Math.max(0.05, 0.15 + (incomeRatio - 1) * 0.12)
  };

  // Normalize to 100%
  const incomeTotal = Object.values(incomeDistribution).reduce((a, b) => a + b, 0);
  Object.keys(incomeDistribution).forEach(key => {
    incomeDistribution[key as keyof typeof incomeDistribution] /= incomeTotal;
  });

  // Insurance and dental visit rates adjusted by income
  const insuranceRate = Math.min(0.95, US_AVERAGES.dentalInsuranceRate * (0.9 + incomeRatio * 0.1));
  const dentalVisitRate = Math.min(0.85, US_AVERAGES.annualDentalVisitRate * (0.85 + incomeRatio * 0.15));

  // Estimated market size (potential annual revenue)
  // Based on implant candidates, average case value, and conversion rates
  const avgCaseValue = 4500; // Average dental implant case value
  const conversionRate = 0.15; // 15% of candidates convert annually
  const estimatedMarketSize = Math.round(basic.implantCandidates * avgCaseValue * conversionRate);

  return {
    ...basic,
    ageDistribution: {
      under18: Math.round(ageDistribution.under18 * 100) / 100,
      age18to34: Math.round(ageDistribution.age18to34 * 100) / 100,
      age35to54: Math.round(ageDistribution.age35to54 * 100) / 100,
      age55to74: Math.round(ageDistribution.age55to74 * 100) / 100,
      age75plus: Math.round(ageDistribution.age75plus * 100) / 100
    },
    incomeDistribution: {
      under50k: Math.round(incomeDistribution.under50k * 100) / 100,
      income50kto100k: Math.round(incomeDistribution.income50kto100k * 100) / 100,
      income100kto150k: Math.round(incomeDistribution.income100kto150k * 100) / 100,
      over150k: Math.round(incomeDistribution.over150k * 100) / 100
    },
    insuranceRate: Math.round(insuranceRate * 100) / 100,
    dentalVisitRate: Math.round(dentalVisitRate * 100) / 100,
    estimatedMarketSize
  };
}

/**
 * Calculate a market score (0-100) based on demographic factors
 */
function calculateMarketScore(factors: {
  population: number;
  medianHouseholdIncome: number;
  medianAge: number;
  implantCandidates: number;
  competitorDensity: number;
}): number {
  let score = 50; // Start at neutral

  // Population factor (max +/- 15 points)
  if (factors.population > 100000) score += 15;
  else if (factors.population > 50000) score += 10;
  else if (factors.population > 25000) score += 5;
  else if (factors.population < 10000) score -= 10;

  // Income factor (max +/- 15 points)
  const incomeRatio = factors.medianHouseholdIncome / US_AVERAGES.medianHouseholdIncome;
  score += Math.min(15, Math.max(-15, (incomeRatio - 1) * 30));

  // Age factor - older populations have more implant needs (max +/- 10 points)
  if (factors.medianAge > 50) score += 10;
  else if (factors.medianAge > 45) score += 7;
  else if (factors.medianAge > 40) score += 3;
  else if (factors.medianAge < 35) score -= 5;

  // Implant candidate density (max +/- 10 points)
  const candidateRate = factors.implantCandidates / factors.population;
  if (candidateRate > 0.08) score += 10;
  else if (candidateRate > 0.06) score += 5;
  else if (candidateRate < 0.04) score -= 5;

  // Competition factor - less competition is better (max +/- 10 points)
  if (factors.competitorDensity < 1) score += 10;
  else if (factors.competitorDensity < 2) score += 5;
  else if (factors.competitorDensity > 4) score -= 10;
  else if (factors.competitorDensity > 3) score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Estimate the number of competing dental practices in a territory
 */
export function estimateCompetitorCount(
  population: number,
  competitorDensity: number
): number {
  // Average is about 1.6 dentists per 2,000 population in the US
  const baseDentists = (population / 2000) * 1.6;

  // Adjust by competitor density factor
  const adjusted = baseDentists * (competitorDensity / 2);

  // Implant providers are roughly 15-20% of general dentists
  const implantProviders = adjusted * 0.17;

  return Math.max(1, Math.round(implantProviders));
}

/**
 * Get a territory tier recommendation based on demographics
 */
export function recommendTerritoryTier(demographics: DemographicEstimate): {
  tier: 'starter' | 'growth' | 'enterprise';
  monthlyPrice: number;
  rationale: string;
} {
  if (demographics.marketScore >= 75 && demographics.population > 150000) {
    return {
      tier: 'enterprise',
      monthlyPrice: 4000,
      rationale: 'High market score with large population - premium territory'
    };
  }

  if (demographics.marketScore >= 60 && demographics.population > 75000) {
    return {
      tier: 'growth',
      monthlyPrice: 2500,
      rationale: 'Strong market potential with solid population base'
    };
  }

  return {
    tier: 'starter',
    monthlyPrice: 1500,
    rationale: 'Entry-level market suitable for new providers'
  };
}
