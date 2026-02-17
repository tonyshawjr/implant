import { prisma } from '$lib/server/db';
import type { PricingTier } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

/**
 * Valid pricing tier names
 */
export type PricingTierName = 'starter' | 'growth' | 'enterprise';

/**
 * Input for creating a new pricing tier
 */
export interface CreatePricingTierInput {
  name: string;
  displayName: string;
  monthlyPrice: number; // In cents
  territorySize: string;
  commitmentMonths: number;
  features: string[];
  isActive?: boolean;
  sortOrder?: number;
}

/**
 * Input for updating a pricing tier
 */
export interface UpdatePricingTierInput {
  name?: string;
  displayName?: string;
  monthlyPrice?: number;
  territorySize?: string;
  commitmentMonths?: number;
  features?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates a pricing tier name
 */
function validateTierName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new Error('Tier name is required and must be a string');
  }

  if (name.length < 2 || name.length > 50) {
    throw new Error('Tier name must be between 2 and 50 characters');
  }

  // Only allow lowercase letters, numbers, and underscores
  if (!/^[a-z0-9_]+$/.test(name)) {
    throw new Error('Tier name must contain only lowercase letters, numbers, and underscores');
  }
}

/**
 * Validates pricing tier input
 */
function validatePricingTierInput(input: CreatePricingTierInput | UpdatePricingTierInput): void {
  if ('name' in input && input.name !== undefined) {
    validateTierName(input.name);
  }

  if ('displayName' in input && input.displayName !== undefined) {
    if (!input.displayName || input.displayName.length < 2 || input.displayName.length > 100) {
      throw new Error('Display name must be between 2 and 100 characters');
    }
  }

  if ('monthlyPrice' in input && input.monthlyPrice !== undefined) {
    if (typeof input.monthlyPrice !== 'number' || input.monthlyPrice < 0) {
      throw new Error('Monthly price must be a non-negative number (in cents)');
    }
    if (!Number.isInteger(input.monthlyPrice)) {
      throw new Error('Monthly price must be an integer (in cents)');
    }
  }

  if ('commitmentMonths' in input && input.commitmentMonths !== undefined) {
    if (typeof input.commitmentMonths !== 'number' || input.commitmentMonths < 1) {
      throw new Error('Commitment months must be a positive integer');
    }
    if (!Number.isInteger(input.commitmentMonths)) {
      throw new Error('Commitment months must be an integer');
    }
  }

  if ('territorySize' in input && input.territorySize !== undefined) {
    if (!input.territorySize || input.territorySize.length < 2) {
      throw new Error('Territory size description is required');
    }
  }

  if ('features' in input && input.features !== undefined) {
    if (!Array.isArray(input.features)) {
      throw new Error('Features must be an array');
    }
    if (input.features.some((f) => typeof f !== 'string')) {
      throw new Error('All features must be strings');
    }
  }

  if ('sortOrder' in input && input.sortOrder !== undefined) {
    if (typeof input.sortOrder !== 'number' || !Number.isInteger(input.sortOrder)) {
      throw new Error('Sort order must be an integer');
    }
  }
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Gets all active pricing tiers, sorted by sortOrder
 */
export async function getPricingTiers(): Promise<PricingTier[]> {
  return prisma.pricingTier.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      sortOrder: 'asc'
    }
  });
}

/**
 * Gets a specific pricing tier by name
 */
export async function getPricingTier(name: string): Promise<PricingTier | null> {
  if (!name) {
    throw new Error('Tier name is required');
  }

  return prisma.pricingTier.findUnique({
    where: { name }
  });
}

/**
 * Gets a pricing tier by ID
 */
export async function getPricingTierById(id: string): Promise<PricingTier | null> {
  if (!id) {
    throw new Error('Tier ID is required');
  }

  return prisma.pricingTier.findUnique({
    where: { id }
  });
}

/**
 * Updates a pricing tier
 */
export async function updatePricingTier(
  id: string,
  data: UpdatePricingTierInput
): Promise<PricingTier> {
  if (!id) {
    throw new Error('Tier ID is required');
  }

  // Validate input
  validatePricingTierInput(data);

  // Check if tier exists
  const existing = await prisma.pricingTier.findUnique({
    where: { id }
  });

  if (!existing) {
    throw new Error(`Pricing tier with ID ${id} not found`);
  }

  // If changing the name, check for uniqueness
  if (data.name && data.name !== existing.name) {
    const existingWithName = await prisma.pricingTier.findUnique({
      where: { name: data.name }
    });
    if (existingWithName) {
      throw new Error(`A pricing tier with the name "${data.name}" already exists`);
    }
  }

  // Build update data, converting features array to JSON if provided
  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.monthlyPrice !== undefined) updateData.monthlyPrice = data.monthlyPrice;
  if (data.territorySize !== undefined) updateData.territorySize = data.territorySize;
  if (data.commitmentMonths !== undefined) updateData.commitmentMonths = data.commitmentMonths;
  if (data.features !== undefined) updateData.features = data.features;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  return prisma.pricingTier.update({
    where: { id },
    data: updateData
  });
}

/**
 * Creates a new pricing tier
 */
export async function createPricingTier(data: CreatePricingTierInput): Promise<PricingTier> {
  // Validate required fields
  if (!data.name) {
    throw new Error('Tier name is required');
  }
  if (!data.displayName) {
    throw new Error('Display name is required');
  }
  if (data.monthlyPrice === undefined) {
    throw new Error('Monthly price is required');
  }
  if (!data.territorySize) {
    throw new Error('Territory size is required');
  }
  if (data.commitmentMonths === undefined) {
    throw new Error('Commitment months is required');
  }
  if (!data.features) {
    throw new Error('Features array is required');
  }

  // Validate input
  validatePricingTierInput(data);

  // Check for existing tier with same name
  const existing = await prisma.pricingTier.findUnique({
    where: { name: data.name }
  });

  if (existing) {
    throw new Error(`A pricing tier with the name "${data.name}" already exists`);
  }

  return prisma.pricingTier.create({
    data: {
      name: data.name,
      displayName: data.displayName,
      monthlyPrice: data.monthlyPrice,
      territorySize: data.territorySize,
      commitmentMonths: data.commitmentMonths,
      features: data.features,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0
    }
  });
}

/**
 * Soft deletes a pricing tier by setting isActive to false
 */
export async function deletePricingTier(id: string): Promise<void> {
  if (!id) {
    throw new Error('Tier ID is required');
  }

  // Check if tier exists
  const existing = await prisma.pricingTier.findUnique({
    where: { id }
  });

  if (!existing) {
    throw new Error(`Pricing tier with ID ${id} not found`);
  }

  await prisma.pricingTier.update({
    where: { id },
    data: { isActive: false }
  });
}

/**
 * Gets the monthly price in dollars for a tier by name
 * Converts from cents to dollars
 */
export async function getMonthlyPrice(tierName: string): Promise<number> {
  if (!tierName) {
    throw new Error('Tier name is required');
  }

  const tier = await prisma.pricingTier.findUnique({
    where: { name: tierName }
  });

  if (!tier) {
    throw new Error(`Pricing tier "${tierName}" not found`);
  }

  // Convert from cents to dollars
  return tier.monthlyPrice / 100;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts a price from cents to dollars
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Converts a price from dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Formats a price in cents as a dollar string (e.g., "$1,500")
 */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(dollars);
}

/**
 * Gets all pricing tiers including inactive ones (for admin use)
 */
export async function getAllPricingTiers(): Promise<PricingTier[]> {
  return prisma.pricingTier.findMany({
    orderBy: {
      sortOrder: 'asc'
    }
  });
}

/**
 * Reactivates a previously deleted (soft-deleted) pricing tier
 */
export async function reactivatePricingTier(id: string): Promise<PricingTier> {
  if (!id) {
    throw new Error('Tier ID is required');
  }

  const existing = await prisma.pricingTier.findUnique({
    where: { id }
  });

  if (!existing) {
    throw new Error(`Pricing tier with ID ${id} not found`);
  }

  return prisma.pricingTier.update({
    where: { id },
    data: { isActive: true }
  });
}
