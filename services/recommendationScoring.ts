import { TraktShow } from './trakt';
import { EnrichedShowData } from './showEnrichment';

export interface ScoredShow {
  show: any;
  traktShow: TraktShow;
  enrichedData?: EnrichedShowData;
  score: number;
}

/**
 * Apply hard filters to recommendation candidates (Production-Grade Relevance Filters)
 * 
 * Filters:
 * 1. Primary genre MUST match (first genre in seed show's genres array)
 * 2. For multi-genre shows: require ≥2 genre overlap
 * 3. Must be within ±5 years of seed show
 * 4. Block animation/anime (unless seed is animated)
 * 5. Require English language (en) OR English-speaking country (US/GB/CA/AU)
 * 6. Minimum Trakt rating ≥7.0
 * 
 * These filters prevent irrelevant recommendations like anime/foreign/vintage content
 * for modern shows (e.g., "I Love LA" 2025 comedy shouldn't show Japanese anime).
 */
export function applyHardFilters(
  seedShow: TraktShow,
  candidates: TraktShow[]
): TraktShow[] {
  const seedGenres = seedShow.genres || [];
  const seedYear = seedShow.year || 0;
  const primaryGenre = seedGenres[0]; // First genre is primary
  
  // Check if seed is animated
  const seedIsAnimated = seedGenres.some(g => 
    g.toLowerCase() === 'animation' || g.toLowerCase() === 'anime'
  );
  
  return candidates.filter(candidate => {
    const candidateGenres = candidate.genres || [];
    const candidateYear = candidate.year || 0;
    
    // CRITICAL: Run animation/language/rating filters FIRST (always apply, even if genres missing)
    
    // Filter 1: Block animation/anime (unless seed is animated)
    if (!seedIsAnimated) {
      const candidateIsAnimated = candidateGenres.some(g => 
        g.toLowerCase() === 'animation' || g.toLowerCase() === 'anime'
      );
      if (candidateIsAnimated) {
        return false;
      }
    }
    
    // Filter 2: Require English language OR English-speaking country
    const language = candidate.language?.toLowerCase();
    const country = candidate.country?.toLowerCase();
    const englishSpeakingCountries = ['us', 'gb', 'ca', 'au'];
    
    // Reject if language is non-English (when present)
    if (language && language !== 'en') {
      return false;
    }
    
    // Reject if country is non-English-speaking (when present)
    if (country && !englishSpeakingCountries.includes(country)) {
      return false;
    }
    
    // Filter 3: Minimum rating ≥6.5 (lowered from 7.0 for better candidate pool)
    const rating = candidate.rating || 0;
    if (rating > 0 && rating < 6.5) {
      return false;
    }
    
    // Skip genre/year filters if metadata missing (but other filters already applied above)
    if (seedGenres.length === 0 || candidateGenres.length === 0) {
      return true;
    }
    
    // Filter 4: Primary genre MUST match
    const primaryGenreMatch = candidateGenres.includes(primaryGenre);
    if (!primaryGenreMatch) {
      return false;
    }
    
    // Filter 5: For multi-genre shows, require ≥2 genre overlap
    const sharedGenres = candidateGenres.filter(g => seedGenres.includes(g));
    const multiGenreMatch = seedGenres.length === 1 || sharedGenres.length >= 2;
    if (!multiGenreMatch) {
      return false;
    }
    
    // Filter 6: Must be within ±5 years
    const withinYearRange = seedYear === 0 || candidateYear === 0 || 
      Math.abs(candidateYear - seedYear) <= 5;
    if (!withinYearRange) {
      return false;
    }
    
    return true;
  });
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
 * Filter and rank candidates by composite score (similarity + popularity)
 * Returns only candidates above the threshold, sorted by final score
 * Enhanced with:
 * - Demographic filtering (exclude kids shows for adult content)
 * - Composite ranking: similarity (60%) + popularity (40%)
 * - Popularity based on Trakt votes and rating
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
  
  // Calculate max votes for normalization (used for popularity scoring)
  const maxVotes = Math.max(...filteredCandidates.map(c => c.traktShow.votes || 0), 1);
  
  // Score and rank with composite scoring
  const scored = filteredCandidates
    .map(candidate => {
      const similarityScore = scoreShowSimilarity(seedShow, candidate);
      
      // Calculate popularity score (0-100) based on votes and rating
      const votes = candidate.traktShow.votes || 0;
      const rating = candidate.traktShow.rating || 0;
      
      // Normalize votes to 0-100 scale
      const normalizedVotes = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
      
      // Normalize rating to 0-100 scale (Trakt uses 0-10)
      const normalizedRating = rating * 10;
      
      // Combine votes (70%) and rating (30%) for popularity score
      const popularityScore = (normalizedVotes * 0.7) + (normalizedRating * 0.3);
      
      // Final composite score: similarity (60%) + popularity (40%)
      const finalScore = (similarityScore * 0.6) + (popularityScore * 0.4);
      
      return {
        ...candidate,
        score: finalScore,
        similarityScore,
        popularityScore
      };
    })
    .filter(item => item.similarityScore >= minScore) // Filter by similarity threshold
    .sort((a, b) => b.score - a.score); // Sort by composite score

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
