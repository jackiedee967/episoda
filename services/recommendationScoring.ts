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
 * Weights:
 * - Genres: 35%
 * - Keywords: 25%
 * - Demographics (network/certification): 15%
 * - Era (release year proximity): 10%
 * - Rating similarity: 15%
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

  // 1. Genre matching (35%)
  const genreScore = calculateGenreScore(
    seedShow.traktShow.genres || [],
    candidateShow.traktShow.genres || []
  );
  totalScore += genreScore * 0.35;

  // 2. Keyword matching (25%)
  const keywordScore = calculateKeywordScore(
    seedShow.enrichedData?.keywords || [],
    candidateShow.enrichedData?.keywords || []
  );
  totalScore += keywordScore * 0.25;

  // 3. Demographics - network and certification (15%)
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

  // 5. Rating similarity (15%)
  const ratingScore = calculateRatingScore(
    seedShow.traktShow.rating,
    candidateShow.traktShow.rating
  );
  totalScore += ratingScore * 0.15;

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
 * Calculate era proximity score (0-100)
 * Shows from similar time periods often have similar production values and cultural context
 */
function calculateEraScore(seedYear: number | null, candidateYear: number | null): number {
  if (!seedYear || !candidateYear) {
    return 50; // Neutral score if year data missing
  }

  const yearDiff = Math.abs(seedYear - candidateYear);

  if (yearDiff === 0) return 100; // Same year
  if (yearDiff <= 2) return 90;   // Within 2 years
  if (yearDiff <= 5) return 75;   // Within 5 years
  if (yearDiff <= 10) return 50;  // Within decade
  if (yearDiff <= 20) return 25;  // Within 2 decades
  return 10; // Older shows
}

/**
 * Calculate rating similarity score (0-100)
 * Users tend to enjoy shows of similar quality levels
 */
function calculateRatingScore(seedRating: number | null, candidateRating: number | null): number {
  if (!seedRating || !candidateRating) {
    return 50; // Neutral if rating data missing
  }

  const ratingDiff = Math.abs(seedRating - candidateRating);

  if (ratingDiff <= 0.5) return 100; // Very similar ratings
  if (ratingDiff <= 1.0) return 85;  // Close ratings
  if (ratingDiff <= 1.5) return 65;  // Somewhat similar
  if (ratingDiff <= 2.0) return 40;  // Different but acceptable
  return 20; // Very different quality levels
}

/**
 * Filter and rank candidates by similarity score
 * Returns only candidates above the threshold, sorted by score
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
  const scored = candidates
    .map(candidate => ({
      ...candidate,
      score: scoreShowSimilarity(seedShow, candidate)
    }))
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return scored;
}
