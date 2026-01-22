/**
 * A/B Testing for Campaigns
 * 
 * Allows creating campaign variants and tracking performance to determine winners
 */

import { supabase } from './supabase';

export interface ABTestVariant {
  id: string;
  testId: string;
  name: string; // e.g., "Variant A", "Variant B"
  content: {
    subject?: string; // For email campaigns
    body: string;
  };
  weight: number; // Percentage of traffic (0-100)
  metrics: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
    openRate?: number;
    clickRate?: number;
    conversionRate?: number;
  };
  createdAt: string;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  type: 'email' | 'social' | 'landing_page';
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ABTestVariant[];
  winner?: string; // variant ID
  startDate?: string;
  endDate?: string;
  sampleSize?: number; // Minimum sample before declaring winner
  confidenceLevel: number; // e.g., 95 = 95% confidence
  autoSelectWinner: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a new A/B test
 */
export async function createABTest(
  test: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt' | 'variants'>
): Promise<ABTest> {
  const { data, error } = await supabase
    .from('ab_tests')
    .insert({
      name: test.name,
      description: test.description,
      type: test.type,
      status: test.status || 'draft',
      winner: test.winner,
      start_date: test.startDate,
      end_date: test.endDate,
      sample_size: test.sampleSize,
      confidence_level: test.confidenceLevel,
      auto_select_winner: test.autoSelectWinner
    })
    .select()
    .single();

  if (error) throw error;

  return mapTestFromDB(data);
}

/**
 * Add variant to A/B test
 */
export async function addVariant(
  testId: string,
  variant: Omit<ABTestVariant, 'id' | 'testId' | 'createdAt' | 'metrics'>
): Promise<ABTestVariant> {
  const { data, error } = await supabase
    .from('ab_test_variants')
    .insert({
      test_id: testId,
      name: variant.name,
      content: variant.content,
      weight: variant.weight,
      metrics: {
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0
      }
    })
    .select()
    .single();

  if (error) throw error;

  return mapVariantFromDB(data);
}

/**
 * Get A/B test by ID with variants
 */
export async function getABTest(testId: string): Promise<ABTest | null> {
  const { data: testData, error: testError } = await supabase
    .from('ab_tests')
    .select('*')
    .eq('id', testId)
    .single();

  if (testError || !testData) return null;

  const { data: variantsData, error: variantsError } = await supabase
    .from('ab_test_variants')
    .select('*')
    .eq('test_id', testId);

  if (variantsError) return null;

  const test = mapTestFromDB(testData);
  test.variants = (variantsData || []).map(mapVariantFromDB);

  return test;
}

/**
 * Get all A/B tests
 */
export async function getAllABTests(): Promise<ABTest[]> {
  const { data, error } = await supabase
    .from('ab_tests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching A/B tests:', error);
    return [];
  }

  // Fetch variants for each test
  const testsWithVariants = await Promise.all(
    (data || []).map(async (testData) => {
      const { data: variantsData } = await supabase
        .from('ab_test_variants')
        .select('*')
        .eq('test_id', testData.id);

      const test = mapTestFromDB(testData);
      test.variants = (variantsData || []).map(mapVariantFromDB);
      return test;
    })
  );

  return testsWithVariants;
}

/**
 * Select variant for user (weighted random selection)
 */
export function selectVariant(variants: ABTestVariant[]): ABTestVariant {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;

  for (const variant of variants) {
    random -= variant.weight;
    if (random <= 0) {
      return variant;
    }
  }

  return variants[0]; // Fallback
}

/**
 * Track event for variant
 */
export async function trackVariantEvent(
  variantId: string,
  event: 'sent' | 'opened' | 'clicked' | 'converted'
): Promise<void> {
  // Get current metrics
  const { data: variant, error: fetchError } = await supabase
    .from('ab_test_variants')
    .select('metrics')
    .eq('id', variantId)
    .single();

  if (fetchError || !variant) {
    console.error('Error fetching variant:', fetchError);
    return;
  }

  // Increment the event counter
  const metrics = variant.metrics || {
    sent: 0,
    opened: 0,
    clicked: 0,
    converted: 0
  };

  metrics[event] = (metrics[event] || 0) + 1;

  // Calculate rates
  if (metrics.sent > 0) {
    metrics.openRate = (metrics.opened / metrics.sent) * 100;
    metrics.clickRate = (metrics.clicked / metrics.sent) * 100;
    metrics.conversionRate = (metrics.converted / metrics.sent) * 100;
  }

  // Update in database
  const { error: updateError } = await supabase
    .from('ab_test_variants')
    .update({ metrics })
    .eq('id', variantId);

  if (updateError) {
    console.error('Error updating variant metrics:', updateError);
  }
}

/**
 * Calculate statistical significance using Z-test
 */
function calculateSignificance(
  variant1: ABTestVariant,
  variant2: ABTestVariant
): { significant: boolean; pValue: number; confidence: number } {
  const n1 = variant1.metrics.sent;
  const n2 = variant2.metrics.sent;
  const p1 = variant1.metrics.converted / n1;
  const p2 = variant2.metrics.converted / n2;

  // Pooled proportion
  const pPool = (variant1.metrics.converted + variant2.metrics.converted) / (n1 + n2);

  // Standard error
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));

  // Z-score
  const z = Math.abs(p1 - p2) / se;

  // P-value (two-tailed test) - simplified
  const pValue = 2 * (1 - normalCDF(z));

  // Confidence level (e.g., 0.05 significance = 95% confidence)
  const confidence = (1 - pValue) * 100;

  return {
    significant: pValue < 0.05, // 95% confidence
    pValue,
    confidence
  };
}

/**
 * Approximate normal CDF
 */
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - prob : prob;
}

/**
 * Determine test winner
 */
export async function determineWinner(testId: string): Promise<{
  winner?: ABTestVariant;
  confidence: number;
  significant: boolean;
  analysis: string;
}> {
  const test = await getABTest(testId);
  if (!test || test.variants.length < 2) {
    return {
      confidence: 0,
      significant: false,
      analysis: 'Need at least 2 variants with data'
    };
  }

  // Sort variants by conversion rate
  const sortedVariants = [...test.variants].sort(
    (a, b) => (b.metrics.conversionRate || 0) - (a.metrics.conversionRate || 0)
  );

  const leader = sortedVariants[0];
  const runnerUp = sortedVariants[1];

  // Check sample size
  if (leader.metrics.sent < (test.sampleSize || 100)) {
    return {
      winner: leader,
      confidence: 0,
      significant: false,
      analysis: `Insufficient sample size. Need ${test.sampleSize || 100} samples, have ${leader.metrics.sent}`
    };
  }

  // Calculate statistical significance
  const stats = calculateSignificance(leader, runnerUp);

  let analysis = `Variant "${leader.name}" has ${leader.metrics.conversionRate?.toFixed(2)}% conversion rate vs "${runnerUp.name}" at ${runnerUp.metrics.conversionRate?.toFixed(2)}%. `;
  
  if (stats.significant) {
    analysis += `The difference is statistically significant with ${stats.confidence.toFixed(1)}% confidence.`;
  } else {
    analysis += `The difference is NOT statistically significant (${stats.confidence.toFixed(1)}% confidence). Continue testing.`;
  }

  // Auto-select winner if enabled and significant
  if (test.autoSelectWinner && stats.significant) {
    await supabase
      .from('ab_tests')
      .update({
        winner: leader.id,
        status: 'completed'
      })
      .eq('id', testId);
  }

  return {
    winner: leader,
    confidence: stats.confidence,
    significant: stats.significant,
    analysis
  };
}

/**
 * Update test status
 */
export async function updateTestStatus(
  testId: string,
  status: ABTest['status']
): Promise<void> {
  const { error } = await supabase
    .from('ab_tests')
    .update({ status })
    .eq('id', testId);

  if (error) throw error;
}

/**
 * Delete A/B test
 */
export async function deleteABTest(testId: string): Promise<void> {
  // Delete variants first (cascade should handle this, but being explicit)
  await supabase
    .from('ab_test_variants')
    .delete()
    .eq('test_id', testId);

  const { error } = await supabase
    .from('ab_tests')
    .delete()
    .eq('id', testId);

  if (error) throw error;
}

// Helper functions to map database records to types
function mapTestFromDB(data: any): ABTest {
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    type: data.type,
    status: data.status,
    variants: [],
    winner: data.winner,
    startDate: data.start_date,
    endDate: data.end_date,
    sampleSize: data.sample_size,
    confidenceLevel: data.confidence_level,
    autoSelectWinner: data.auto_select_winner,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

function mapVariantFromDB(data: any): ABTestVariant {
  return {
    id: data.id,
    testId: data.test_id,
    name: data.name,
    content: data.content,
    weight: data.weight,
    metrics: data.metrics,
    createdAt: data.created_at
  };
}
