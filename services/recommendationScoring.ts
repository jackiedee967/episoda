import { TraktShow } from './trakt';
import { EnrichedShowData } from './showEnrichment';

export interface ScoredShow {
  show: any;
  traktShow: TraktShow;
  enrichedData?: EnrichedShowData;
  score: number;
}

/**
 * Calculate similarity score between two shows
 * Uses weighted attribute matching for intelligent recommendations
 * 
 * Weights (Enhanced with Demographic Filtering - Nov 23, 2025):
 * - Genres: 50% (primary signal for Trakt recommendations)
 * - Keywords: 15% (reduced until enrichment improves)
 * - Demographics (network/country): 15%
 * - Era (release year proximity): 10% (ENHANCED with ±5 year bonus, >20 year penalty)
 * - Rating similarity: 10% (ENHANCED with tier matching penalties)
 * 
 * Demographic Filtering (Pre-scoring):
 * - Filter kids shows (Children, Kids, Family, Animation genres + Disney/Nick networks) for adult content
 * - Release date similarity: ±5 years bonus, >20 years strong penalty
 * - Rating tier matching: Penalize quality mismatches (e.g., 8.5 → 3.0)
 */
export function scoreShowSimilarity(
  seedShow: {
    traktShow: TraktShow;
    enrichedData?: EnrichedShowData;
  },
  candidateShow: {
    traktShow: TraktShow;
    enrichedData?: EnrichedShowData;
  }
): number {
  let totalScore = 0;

  // 1. Genre matching (50% - primary signal for Trakt-only recommendations)
  const genreScore = calculateGenreScore(
    seedShow.traktShow.genres || [],
    candidateShow.traktShow.genres || []
  );
  totalScore += genreScore * 0.50;

  // 2. Keyword matching (15% - reduced weight until enrichment improves)
  const keywordScore = calculateKeywordScore(
    seedShow.enrichedData?.keywords || [],
    candidateShow.enrichedData?.keywords || []
  );
  totalScore += keywordScore * 0.15;

  // 3. Demographics - network and country (15%)
  const demographicScore = calculateDemographicScore(
    seedShow.traktShow,
    candidateShow.traktShow
  );
  totalScore += demographicScore * 0.15;

  // 4. Era proximity (10%)
  const eraScore = calculateEraScore(
    seedShow.traktShow.year || null,
    candidateShow.traktShow.year || null
  );
  totalScore += eraScore * 0.10;

  // 5. Rating similarity (10%)
  const ratingScore = calculateRatingScore(
    seedShow.traktShow.rating,
    candidateShow.traktShow.rating
  );
  totalScore += ratingScore * 0.10;

  return Math.round(totalScore * 100) / 100;
}

/**
 * Calculate genre overlap score (0-100)
 */
function calculateGenreScore(seedGenres: string[], candidateGenres: string[]): number {
  if (seedGenres.length === 0 || candidateGenres.length === 0) {
    return 0;
  }

  const seedSet = new Set(seedGenres.map(g => g.toLowerCase()));
  const candidateSet = new Set(candidateGenres.map(g => g.toLowerCase()));

  let matches = 0;
  for (const genre of seedSet) {
    if (candidateSet.has(genre)) {
      matches++;
    }
  }

  // Jaccard similarity: intersection / union
  const union = new Set([...seedSet, ...candidateSet]).size;
  return (matches / union) * 100;
}

/**
 * Calculate keyword overlap score (0-100)
 * Uses Jaccard similarity with weighting for exact vs partial matches
 */
function calculateKeywordScore(seedKeywords: string[], candidateKeywords: string[]): number {
  if (seedKeywords.length === 0 || candidateKeywords.length === 0) {
    return 0;
  }

  const seedSet = new Set(seedKeywords.map(k => k.toLowerCase()));
  const candidateSet = new Set(candidateKeywords.map(k => k.toLowerCase()));

  let exactMatches = 0;
  for (const keyword of seedSet) {
    if (candidateSet.has(keyword)) {
      exactMatches++;
    }
  }

  // Jaccard similarity
  const union = new Set([...seedSet, ...candidateSet]).size;
  return (exactMatches / union) * 100;
}

/**
 * Calculate demographic similarity (0-100)
 * Based on network and country
 */
function calculateDemographicScore(seedShow: TraktShow, candidateShow: TraktShow): number {
  let score = 0;
  let factors = 0;

  // Network matching (higher weight)
  if (seedShow.network && candidateShow.network) {
    factors++;
    if (seedShow.network === candidateShow.network) {
      score += 100;
    } else {
      // Partial match for streaming services
      const streamingNetworks = ['Netflix', 'Hulu', 'Prime Video', 'Apple TV+', 'Disney+', 'HBO Max', 'Paramount+'];
      const seedIsStreaming = streamingNetworks.includes(seedShow.network);
      const candidateIsStreaming = streamingNetworks.includes(candidateShow.network);
      
      if (seedIsStreaming && candidateIsStreaming) {
        score += 50; // Both streaming services = similar demographic
      }
    }
  }

  // Country matching
  if (seedShow.country && candidateShow.country) {
    factors++;
    if (seedShow.country === candidateShow.country) {
      score += 100;
    }
  }

  return factors > 0 ? score / factors : 50; // Default to neutral if no demographic data
}

/**
 * Calculate era proximity score (0-100) with enhanced release date similarity
 * Shows from similar time periods often have similar production values and cultural context
 * Enhanced with:
 * - Bonus for ±5 years (sweet spot for similar era)
 * - Penalty for >10 years difference (different cultural context)
 * - Recency bias penalty for very old shows (>20 years difference)
 */
function calculateEraScore(seedYear: number | null, candidateYear: number | null): number {
  if (!seedYear || !candidateYear) {
    return 50; // Neutral score if year data missing
  }

  const yearDiff = Math.abs(seedYear - candidateYear);

  // Enhanced scoring with bonuses and penalties
  if (yearDiff === 0) return 100;  // Same year - perfect match
  if (yearDiff <= 2) return 95;    // Within 2 years - excellent match
  if (yearDiff <= 5) return 85;    // Within 5 years - BONUS for similar era
  if (yearDiff <= 10) return 60;   // Within decade - good match
  if (yearDiff <= 15) return 35;   // Within 15 years - acceptable
  if (yearDiff <= 20) return 20;   // Within 2 decades - PENALTY for different era
  return 5; // >20 years - STRONG PENALTY for vastly different cultural context
}

/**
 * Calculate rating similarity score (0-100) with tier matching
 * Users tend to enjoy shows of similar quality levels
 * Enhanced with:
 * - Rating tier matching (don't recommend 3.0 shows for 8.5 seeds)
 * - Penalty for crossing quality tiers (great → poor)
 */
function calculateRatingScore(seedRating: number | null, candidateRating: number | null): number {
  if (!seedRating || !candidateRating) {
    return 50; // Neutral if rating data missing
  }

  const ratingDiff = Math.abs(seedRating - candidateRating);

  // Enhanced tier matching with stronger penalties for quality mismatches
  if (ratingDiff <= 0.5) return 100;  // Very similar ratings - perfect
  if (ratingDiff <= 1.0) return 85;   // Close ratings - excellent
  if (ratingDiff <= 1.5) return 65;   // Somewhat similar - good
  if (ratingDiff <= 2.0) return 40;   // Different but acceptable
  if (ratingDiff <= 3.0) return 20;   // Different tier - penalty
  return 5; // Very different quality levels - STRONG PENALTY (e.g., 8.5 → 3.0)
}

/**
 * Detect if a show is targeted at children
 * Based on genres, network, and content indicators
 */
function isKidsShow(traktShow: TraktShow): boolean {
  const genres = traktShow.genres?.map(g => g.toLowerCase()) || [];
  const network = traktShow.network?.toLowerCase() || '';
  
  // Kids-specific genres
  const kidsGenres = ['children', 'kids', 'family', 'animation'];
  if (genres.some(g => kidsGenres.includes(g))) {
    return true;
  }
  
  // Kids-specific networks
  const kidsNetworks = ['nickelodeon', 'disney', 'cartoon network', 'nick jr', 'disney junior', 'pbs kids'];
  if (kidsNetworks.some(kn => network.includes(kn))) {
    return true;
  }
  
  return false;
}

/**
 * Filter and rank candidates by similarity score with demographic filtering
 * Returns only candidates above the threshold, sorted by score
 * Enhanced with:
 * - Demographic filtering (exclude kids shows for adult content)
 * - Rating tier validation
 * - Era proximity enforcement
 */
export function rankCandidates(
  seedShow: {
    traktShow: TraktShow;
    enrichedData?: EnrichedShowData;
  },
  candidates: Array<{
    show: any;
    traktShow: TraktShow;
    enrichedData?: EnrichedShowData;
  }>,
  minScore: number = 40 // Minimum similarity score threshold
): ScoredShow[] {
  // First, apply demographic filtering
  let filteredCandidates = candidates;
  
  // Filter out kids shows if seed show is not for kids
  const seedIsKids = isKidsShow(seedShow.traktShow);
  if (!seedIsKids) {
    filteredCandidates = filteredCandidates.filter(candidate => !isKidsShow(candidate.traktShow));
  }
  
  // Then score and rank
  const scored = filteredCandidates
    .map(candidate => {
      const score = scoreShowSimilarity(seedShow, candidate);
      return {
        ...candidate,
        score
      };
    })
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score);

  // Debug logging
  if (scored.length === 0 && candidates.length > 0) {
    const allScored = candidates.map(c => ({
      ...c,
      score: scoreShowSimilarity(seedShow, c)
    })).sort((a, b) => b.score - a.score);
    console.log(`🔍 Ranking debug for "${seedShow.traktShow.title}":`);
    console.log(`  Seed genres: ${seedShow.traktShow.genres?.join(', ') || 'none'}`);
    console.log(`  Seed keywords: ${seedShow.enrichedData?.keywords?.length || 0} keywords`);
    console.log(`  Top 3 candidate scores:`, allScored.slice(0, 3).map(s => ({
      title: s.traktShow.title,
      score: s.score.toFixed(1),
      genres: s.traktShow.genres?.join(', ') || 'none',
      keywords: s.enrichedData?.keywords?.length || 0
    })));
  }

  return scored;
}
