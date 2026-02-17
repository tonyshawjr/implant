/**
 * Benchmarks Service
 *
 * Reads/writes from the BusinessBenchmark table to manage performance benchmarks
 * for different verticals and metrics.
 */

import { prisma } from '$lib/server/db';
import type { BusinessBenchmark } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export type BenchmarkMetric = 'ctr' | 'cpl' | 'conversion_rate' | 'case_value';
export type PerformanceLevel = 'poor' | 'average' | 'good' | 'excellent';

export interface BenchmarkThresholds {
	poor: number;
	average: number;
	good: number;
	excellent: number;
}

export interface UpdateBenchmarkInput {
	vertical?: string;
	metric?: string;
	poor?: number;
	average?: number;
	good?: number;
	excellent?: number;
	unit?: string | null;
}

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_VERTICAL = 'dental_implants';
const DEFAULT_CASE_VALUE = 4000; // $4,000 for dental implants

// Default benchmarks for dental implants vertical (used as fallback)
const DEFAULT_BENCHMARKS: Record<BenchmarkMetric, BenchmarkThresholds & { unit: string | null }> = {
	ctr: {
		poor: 0.5,
		average: 1.5,
		good: 3.0,
		excellent: 5.0,
		unit: '%'
	},
	cpl: {
		poor: 200, // Higher CPL is worse, so thresholds are inverted
		average: 120,
		good: 80,
		excellent: 50,
		unit: '$'
	},
	conversion_rate: {
		poor: 5,
		average: 15,
		good: 25,
		excellent: 40,
		unit: '%'
	},
	case_value: {
		poor: 2000,
		average: 3000,
		good: 4000,
		excellent: 6000,
		unit: '$'
	}
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Get all benchmarks, optionally filtered by vertical
 */
export async function getBenchmarks(vertical?: string): Promise<BusinessBenchmark[]> {
	const whereClause = vertical ? { vertical } : {};

	const benchmarks = await prisma.businessBenchmark.findMany({
		where: whereClause,
		orderBy: [{ vertical: 'asc' }, { metric: 'asc' }]
	});

	return benchmarks;
}

/**
 * Get a specific benchmark by metric and optional vertical
 */
export async function getBenchmark(
	metric: string,
	vertical?: string
): Promise<BusinessBenchmark | null> {
	const benchmark = await prisma.businessBenchmark.findFirst({
		where: {
			metric,
			vertical: vertical ?? DEFAULT_VERTICAL
		}
	});

	return benchmark;
}

/**
 * Get the case value benchmark (default: $4,000 for dental_implants)
 */
export async function getCaseValue(vertical?: string): Promise<number> {
	const benchmark = await getBenchmark('case_value', vertical ?? DEFAULT_VERTICAL);

	if (!benchmark) {
		// Return default case value if no benchmark exists
		return DEFAULT_CASE_VALUE;
	}

	// Return the 'good' threshold as the standard case value
	return benchmark.good;
}

/**
 * Get the conversion rate benchmark
 */
export async function getConversionRate(vertical?: string): Promise<number> {
	const benchmark = await getBenchmark('conversion_rate', vertical ?? DEFAULT_VERTICAL);

	if (!benchmark) {
		// Return default conversion rate if no benchmark exists
		return DEFAULT_BENCHMARKS.conversion_rate.average;
	}

	// Return the 'average' threshold as the standard conversion rate
	return benchmark.average;
}

/**
 * Update a benchmark by ID
 */
export async function updateBenchmark(
	id: string,
	data: UpdateBenchmarkInput
): Promise<BusinessBenchmark> {
	// Validate that thresholds maintain proper ordering
	if (data.poor !== undefined || data.average !== undefined || data.good !== undefined || data.excellent !== undefined) {
		const current = await prisma.businessBenchmark.findUnique({ where: { id } });

		if (!current) {
			throw new Error(`Benchmark with ID ${id} not found`);
		}

		// Merge current values with updates
		const newValues = {
			poor: data.poor ?? current.poor,
			average: data.average ?? current.average,
			good: data.good ?? current.good,
			excellent: data.excellent ?? current.excellent
		};

		// Check if this is an inverted metric (like CPL where lower is better)
		const isInverted = current.metric === 'cpl';

		if (isInverted) {
			// For inverted metrics: poor > average > good > excellent
			if (
				newValues.poor < newValues.average ||
				newValues.average < newValues.good ||
				newValues.good < newValues.excellent
			) {
				throw new Error(
					`For ${current.metric}, thresholds must be in descending order (poor > average > good > excellent)`
				);
			}
		} else {
			// For normal metrics: poor < average < good < excellent
			if (
				newValues.poor > newValues.average ||
				newValues.average > newValues.good ||
				newValues.good > newValues.excellent
			) {
				throw new Error(
					`For ${current.metric}, thresholds must be in ascending order (poor < average < good < excellent)`
				);
			}
		}
	}

	const updatedBenchmark = await prisma.businessBenchmark.update({
		where: { id },
		data: {
			...data,
			updatedAt: new Date()
		}
	});

	return updatedBenchmark;
}

/**
 * Determine performance level for a given metric and value
 *
 * For most metrics (CTR, conversion_rate, case_value): higher is better
 * For CPL: lower is better (inverted)
 */
export async function getPerformanceLevel(
	metric: string,
	value: number,
	vertical?: string
): Promise<PerformanceLevel> {
	const benchmark = await getBenchmark(metric, vertical ?? DEFAULT_VERTICAL);

	// Use default benchmarks if no database entry exists
	const thresholds: BenchmarkThresholds = benchmark
		? {
				poor: benchmark.poor,
				average: benchmark.average,
				good: benchmark.good,
				excellent: benchmark.excellent
			}
		: (DEFAULT_BENCHMARKS[metric as BenchmarkMetric] ?? DEFAULT_BENCHMARKS.ctr);

	// Check if this is an inverted metric (like CPL where lower is better)
	const isInverted = metric === 'cpl';

	if (isInverted) {
		// For CPL: lower values are better
		// poor: >= 200, average: 120-199, good: 80-119, excellent: < 50
		if (value <= thresholds.excellent) return 'excellent';
		if (value <= thresholds.good) return 'good';
		if (value <= thresholds.average) return 'average';
		return 'poor';
	} else {
		// For other metrics: higher values are better
		// excellent: >= 5.0, good: 3.0-4.99, average: 1.5-2.99, poor: < 1.5
		if (value >= thresholds.excellent) return 'excellent';
		if (value >= thresholds.good) return 'good';
		if (value >= thresholds.average) return 'average';
		return 'poor';
	}
}

// ============================================================================
// Additional Helper Functions
// ============================================================================

/**
 * Get all benchmark thresholds for a specific metric
 */
export async function getBenchmarkThresholds(
	metric: string,
	vertical?: string
): Promise<BenchmarkThresholds | null> {
	const benchmark = await getBenchmark(metric, vertical);

	if (!benchmark) {
		// Return defaults if available
		const defaults = DEFAULT_BENCHMARKS[metric as BenchmarkMetric];
		if (defaults) {
			return {
				poor: defaults.poor,
				average: defaults.average,
				good: defaults.good,
				excellent: defaults.excellent
			};
		}
		return null;
	}

	return {
		poor: benchmark.poor,
		average: benchmark.average,
		good: benchmark.good,
		excellent: benchmark.excellent
	};
}

/**
 * Create a new benchmark entry
 */
export async function createBenchmark(data: {
	vertical?: string;
	metric: string;
	poor: number;
	average: number;
	good: number;
	excellent: number;
	unit?: string | null;
}): Promise<BusinessBenchmark> {
	// Validate threshold ordering
	const isInverted = data.metric === 'cpl';

	if (isInverted) {
		if (
			data.poor < data.average ||
			data.average < data.good ||
			data.good < data.excellent
		) {
			throw new Error(
				`For ${data.metric}, thresholds must be in descending order (poor > average > good > excellent)`
			);
		}
	} else {
		if (
			data.poor > data.average ||
			data.average > data.good ||
			data.good > data.excellent
		) {
			throw new Error(
				`For ${data.metric}, thresholds must be in ascending order (poor < average < good < excellent)`
			);
		}
	}

	const benchmark = await prisma.businessBenchmark.create({
		data: {
			vertical: data.vertical ?? DEFAULT_VERTICAL,
			metric: data.metric,
			poor: data.poor,
			average: data.average,
			good: data.good,
			excellent: data.excellent,
			unit: data.unit ?? null
		}
	});

	return benchmark;
}

/**
 * Delete a benchmark by ID
 */
export async function deleteBenchmark(id: string): Promise<void> {
	await prisma.businessBenchmark.delete({
		where: { id }
	});
}

/**
 * Get all available verticals that have benchmarks defined
 */
export async function getAvailableVerticals(): Promise<string[]> {
	const benchmarks = await prisma.businessBenchmark.findMany({
		select: { vertical: true },
		distinct: ['vertical']
	});

	return benchmarks.map((b) => b.vertical);
}

/**
 * Seed default benchmarks for a vertical if they don't exist
 */
export async function seedDefaultBenchmarks(vertical: string = DEFAULT_VERTICAL): Promise<void> {
	const existingBenchmarks = await getBenchmarks(vertical);

	// Create a set of existing metrics for quick lookup
	const existingMetrics = new Set(existingBenchmarks.map((b) => b.metric));

	// Create missing benchmarks
	for (const [metric, thresholds] of Object.entries(DEFAULT_BENCHMARKS)) {
		if (!existingMetrics.has(metric)) {
			await createBenchmark({
				vertical,
				metric,
				poor: thresholds.poor,
				average: thresholds.average,
				good: thresholds.good,
				excellent: thresholds.excellent,
				unit: thresholds.unit
			});
		}
	}
}

/**
 * Calculate performance score (0-100) based on benchmark comparison
 */
export async function calculatePerformanceScore(
	metric: string,
	value: number,
	vertical?: string
): Promise<number> {
	const benchmark = await getBenchmark(metric, vertical ?? DEFAULT_VERTICAL);

	const thresholds: BenchmarkThresholds = benchmark
		? {
				poor: benchmark.poor,
				average: benchmark.average,
				good: benchmark.good,
				excellent: benchmark.excellent
			}
		: (DEFAULT_BENCHMARKS[metric as BenchmarkMetric] ?? DEFAULT_BENCHMARKS.ctr);

	const isInverted = metric === 'cpl';

	if (isInverted) {
		// For inverted metrics: lower is better
		if (value <= thresholds.excellent) return 100;
		if (value >= thresholds.poor) return 0;

		// Linear interpolation between thresholds
		if (value <= thresholds.good) {
			// Between excellent and good: 75-100
			const range = thresholds.good - thresholds.excellent;
			const position = thresholds.good - value;
			return 75 + (position / range) * 25;
		}
		if (value <= thresholds.average) {
			// Between good and average: 50-75
			const range = thresholds.average - thresholds.good;
			const position = thresholds.average - value;
			return 50 + (position / range) * 25;
		}
		// Between average and poor: 0-50
		const range = thresholds.poor - thresholds.average;
		const position = thresholds.poor - value;
		return (position / range) * 50;
	} else {
		// For normal metrics: higher is better
		if (value >= thresholds.excellent) return 100;
		if (value <= thresholds.poor) return 0;

		// Linear interpolation between thresholds
		if (value >= thresholds.good) {
			// Between good and excellent: 75-100
			const range = thresholds.excellent - thresholds.good;
			const position = value - thresholds.good;
			return 75 + (position / range) * 25;
		}
		if (value >= thresholds.average) {
			// Between average and good: 50-75
			const range = thresholds.good - thresholds.average;
			const position = value - thresholds.average;
			return 50 + (position / range) * 25;
		}
		// Between poor and average: 0-50
		const range = thresholds.average - thresholds.poor;
		const position = value - thresholds.poor;
		return (position / range) * 50;
	}
}
