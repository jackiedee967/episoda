/**
 * Curated nano-genres for TV show discovery
 * Each nano-genre is mapped to:
 * - Parent genre(s)
 * - TMDB keyword ID for API filtering
 * - Emoji for visual appeal
 * 
 * NOTE: TMDB keyword IDs need to be properly fetched via TMDB keyword search API.
 * These are placeholders and should be verified/updated for production use.
 * For now, genre filtering works without keyword filtering.
 * 
 * Only includes nano-genres with 12+ shows in TMDB for quality discovery
 */

export interface NanoGenre {
  id: string;
  name: string;
  emoji: string;
  tmdbKeywordId: number | null; // null = keyword ID needs to be researched
  parentGenres: string[]; // Maps to genre slugs
}

export const CURATED_NANO_GENRES: NanoGenre[] = [
  // Crime & Thriller (using Drama 18 as base genre)
  { id: 'murder-investigation', name: 'Murder Investigation', emoji: '🔍', tmdbKeywordId: null, parentGenres: ['crime', 'mystery', 'drama'] },
  { id: 'serial-killer', name: 'Serial Killer', emoji: '🔪', tmdbKeywordId: null, parentGenres: ['crime', 'drama'] },
  { id: 'police-procedural', name: 'Police Procedural', emoji: '👮', tmdbKeywordId: null, parentGenres: ['crime', 'drama'] },
  { id: 'organized-crime', name: 'Organized Crime', emoji: '🕴️', tmdbKeywordId: null, parentGenres: ['crime', 'drama'] },
  { id: 'heist', name: 'Heist', emoji: '💰', tmdbKeywordId: null, parentGenres: ['crime', 'action'] },
  { id: 'detective', name: 'Detective', emoji: '🕵️', tmdbKeywordId: null, parentGenres: ['crime', 'mystery'] },
  { id: 'drug-trade', name: 'Drug Trade', emoji: '💊', tmdbKeywordId: null, parentGenres: ['crime', 'drama'] },
  { id: 'courtroom', name: 'Courtroom Drama', emoji: '⚖️', tmdbKeywordId: null, parentGenres: ['crime', 'drama'] },
  { id: 'conspiracy', name: 'Conspiracy', emoji: '🕸️', tmdbKeywordId: null, parentGenres: ['mystery', 'drama'] },
  { id: 'espionage', name: 'Espionage', emoji: '🎭', tmdbKeywordId: null, parentGenres: ['action', 'drama'] },

  // Sci-Fi & Fantasy (using Sci-Fi & Fantasy 10765 as base)
  { id: 'time-travel', name: 'Time Travel', emoji: '⏰', tmdbKeywordId: 4379, parentGenres: ['science-fiction', 'fantasy'] },
  { id: 'post-apocalyptic', name: 'Post-Apocalyptic', emoji: '☢️', tmdbKeywordId: 4458, parentGenres: ['science-fiction', 'drama'] },
  { id: 'aliens', name: 'Aliens', emoji: '👽', tmdbKeywordId: null, parentGenres: ['science-fiction'] },
  { id: 'space-exploration', name: 'Space Exploration', emoji: '🚀', tmdbKeywordId: null, parentGenres: ['science-fiction'] },
  { id: 'dystopia', name: 'Dystopia', emoji: '🏚️', tmdbKeywordId: null, parentGenres: ['science-fiction', 'drama'] },
  { id: 'artificial-intelligence', name: 'AI & Robots', emoji: '🤖', tmdbKeywordId: null, parentGenres: ['science-fiction'] },
  { id: 'alternate-reality', name: 'Alternate Reality', emoji: '🌀', tmdbKeywordId: null, parentGenres: ['science-fiction', 'fantasy'] },
  { id: 'superhero', name: 'Superhero', emoji: '🦸', tmdbKeywordId: 9715, parentGenres: ['action', 'fantasy'] },
  { id: 'magic', name: 'Magic', emoji: '✨', tmdbKeywordId: null, parentGenres: ['fantasy'] },
  { id: 'parallel-universe', name: 'Parallel Universe', emoji: '🌌', tmdbKeywordId: null, parentGenres: ['science-fiction', 'fantasy'] },
  { id: 'zombie', name: 'Zombie', emoji: '🧟', tmdbKeywordId: 12377, parentGenres: ['science-fiction', 'drama'] },
  { id: 'vampire', name: 'Vampire', emoji: '🧛', tmdbKeywordId: 12565, parentGenres: ['fantasy', 'drama'] },

  // Drama & Romance
  { id: 'coming-of-age', name: 'Coming of Age', emoji: '🌱', tmdbKeywordId: 1562, parentGenres: ['drama'] },
  { id: 'family-drama', name: 'Family Drama', emoji: '👨‍👩‍👧‍👦', tmdbKeywordId: null, parentGenres: ['drama', 'family'] },
  { id: 'high-school', name: 'High School', emoji: '🎓', tmdbKeywordId: null, parentGenres: ['drama', 'comedy'] },
  { id: 'hospital', name: 'Hospital', emoji: '🏥', tmdbKeywordId: null, parentGenres: ['drama'] },
  { id: 'workplace-drama', name: 'Workplace Drama', emoji: '💼', tmdbKeywordId: null, parentGenres: ['drama', 'comedy'] },
  { id: 'forbidden-love', name: 'Forbidden Love', emoji: '💔', tmdbKeywordId: null, parentGenres: ['drama'] },
  { id: 'love-triangle', name: 'Love Triangle', emoji: '💕', tmdbKeywordId: null, parentGenres: ['drama'] },
  { id: 'second-chance', name: 'Second Chance', emoji: '💝', tmdbKeywordId: null, parentGenres: ['drama'] },
  { id: 'friends-to-lovers', name: 'Friends to Lovers', emoji: '🥰', tmdbKeywordId: null, parentGenres: ['comedy', 'drama'] },
  { id: 'small-town', name: 'Small Town', emoji: '🏘️', tmdbKeywordId: null, parentGenres: ['drama'] },
  { id: 'addiction', name: 'Addiction', emoji: '🍷', tmdbKeywordId: null, parentGenres: ['drama'] },
  { id: 'mental-health', name: 'Mental Health', emoji: '🧠', tmdbKeywordId: null, parentGenres: ['drama'] },

  // Comedy
  { id: 'sitcom', name: 'Sitcom', emoji: '😄', tmdbKeywordId: 9840, parentGenres: ['comedy'] },
  { id: 'workplace-comedy', name: 'Workplace Comedy', emoji: '🏢', tmdbKeywordId: null, parentGenres: ['comedy'] },
  { id: 'mockumentary', name: 'Mockumentary', emoji: '🎬', tmdbKeywordId: null, parentGenres: ['comedy'] },
  { id: 'romantic-comedy', name: 'Romantic Comedy', emoji: '💑', tmdbKeywordId: null, parentGenres: ['comedy'] },
  { id: 'satire', name: 'Satire', emoji: '🎭', tmdbKeywordId: null, parentGenres: ['comedy'] },
  { id: 'slapstick', name: 'Slapstick', emoji: '🤪', tmdbKeywordId: null, parentGenres: ['comedy'] },
  { id: 'dark-comedy', name: 'Dark Comedy', emoji: '😈', tmdbKeywordId: null, parentGenres: ['comedy', 'drama'] },
  { id: 'fish-out-of-water', name: 'Fish Out of Water', emoji: '🐟', tmdbKeywordId: null, parentGenres: ['comedy'] },

  // Action & Adventure
  { id: 'martial-arts', name: 'Martial Arts', emoji: '🥋', tmdbKeywordId: null, parentGenres: ['action'] },
  { id: 'sword-fight', name: 'Sword Fight', emoji: '⚔️', tmdbKeywordId: null, parentGenres: ['action', 'fantasy'] },
  { id: 'treasure-hunt', name: 'Treasure Hunt', emoji: '🗺️', tmdbKeywordId: null, parentGenres: ['action'] },
  { id: 'survival', name: 'Survival', emoji: '🏕️', tmdbKeywordId: null, parentGenres: ['action', 'drama'] },
  { id: 'military', name: 'Military', emoji: '🪖', tmdbKeywordId: null, parentGenres: ['action', 'war'] },
  { id: 'revenge', name: 'Revenge', emoji: '💢', tmdbKeywordId: null, parentGenres: ['action', 'drama'] },
  { id: 'vigilante', name: 'Vigilante', emoji: '🦇', tmdbKeywordId: null, parentGenres: ['action', 'crime'] },

  // Historical & Period
  { id: 'world-war-ii', name: 'World War II', emoji: '🎖️', tmdbKeywordId: null, parentGenres: ['war', 'drama'] },
  { id: 'medieval', name: 'Medieval', emoji: '🏰', tmdbKeywordId: null, parentGenres: ['fantasy', 'drama'] },
  { id: 'victorian-era', name: 'Victorian Era', emoji: '🎩', tmdbKeywordId: null, parentGenres: ['drama'] },
  { id: 'cold-war', name: 'Cold War', emoji: '🕊️', tmdbKeywordId: null, parentGenres: ['drama'] },
  { id: 'wild-west', name: 'Wild West', emoji: '🤠', tmdbKeywordId: null, parentGenres: ['western'] },
  { id: 'ancient-rome', name: 'Ancient Rome', emoji: '🏛️', tmdbKeywordId: null, parentGenres: ['drama'] },
  { id: 'royalty', name: 'Royalty', emoji: '👑', tmdbKeywordId: null, parentGenres: ['drama'] },
  { id: 'political-intrigue', name: 'Political Intrigue', emoji: '🏛️', tmdbKeywordId: null, parentGenres: ['drama'] },

  // Horror & Supernatural (Drama genre fallback)
  { id: 'haunted-house', name: 'Haunted House', emoji: '🏚️', tmdbKeywordId: null, parentGenres: ['mystery', 'drama'] },
  { id: 'ghost', name: 'Ghost', emoji: '👻', tmdbKeywordId: null, parentGenres: ['fantasy', 'mystery'] },
  { id: 'demon', name: 'Demon', emoji: '😈', tmdbKeywordId: null, parentGenres: ['fantasy', 'mystery'] },
  { id: 'witch', name: 'Witch', emoji: '🧙‍♀️', tmdbKeywordId: null, parentGenres: ['fantasy'] },
  { id: 'monster', name: 'Monster', emoji: '👹', tmdbKeywordId: null, parentGenres: ['fantasy', 'mystery'] },
  { id: 'possession', name: 'Possession', emoji: '😱', tmdbKeywordId: null, parentGenres: ['mystery', 'drama'] },
  { id: 'cult', name: 'Cult', emoji: '🕯️', tmdbKeywordId: null, parentGenres: ['mystery', 'drama'] },

  // Lifestyle & Reality
  { id: 'cooking-competition', name: 'Cooking Competition', emoji: '👨‍🍳', tmdbKeywordId: null, parentGenres: ['reality'] },
  { id: 'dating-show', name: 'Dating Show', emoji: '💐', tmdbKeywordId: null, parentGenres: ['reality'] },
  { id: 'home-renovation', name: 'Home Renovation', emoji: '🏠', tmdbKeywordId: null, parentGenres: ['reality'] },
  { id: 'talent-competition', name: 'Talent Competition', emoji: '🎤', tmdbKeywordId: null, parentGenres: ['reality'] },
  { id: 'travel', name: 'Travel', emoji: '✈️', tmdbKeywordId: null, parentGenres: ['documentary'] },
  { id: 'nature-wildlife', name: 'Nature & Wildlife', emoji: '🦁', tmdbKeywordId: null, parentGenres: ['documentary'] },

  // Animation & Kids
  { id: 'cartoon', name: 'Cartoon', emoji: '🎨', tmdbKeywordId: null, parentGenres: ['animation', 'comedy'] },
  { id: 'anime', name: 'Anime', emoji: '🎌', tmdbKeywordId: 210024, parentGenres: ['animation', 'anime'] },
  { id: 'educational', name: 'Educational', emoji: '📚', tmdbKeywordId: null, parentGenres: ['family', 'kids'] },
  { id: 'fairy-tale', name: 'Fairy Tale', emoji: '🧚', tmdbKeywordId: null, parentGenres: ['family', 'fantasy'] },

  // Music & Arts
  { id: 'musical', name: 'Musical', emoji: '🎵', tmdbKeywordId: null, parentGenres: ['music'] },
  { id: 'band', name: 'Band', emoji: '🎸', tmdbKeywordId: null, parentGenres: ['music', 'drama'] },
  { id: 'theater', name: 'Theater', emoji: '🎭', tmdbKeywordId: null, parentGenres: ['drama'] },

  // Sports
  { id: 'football', name: 'Football', emoji: '🏈', tmdbKeywordId: null, parentGenres: ['drama'] },
  { id: 'basketball', name: 'Basketball', emoji: '🏀', tmdbKeywordId: null, parentGenres: ['drama'] },
  { id: 'boxing', name: 'Boxing', emoji: '🥊', tmdbKeywordId: null, parentGenres: ['action', 'drama'] },
  { id: 'racing', name: 'Racing', emoji: '🏎️', tmdbKeywordId: null, parentGenres: ['action'] },

  // Specific Themes
  { id: 'based-on-book', name: 'Based on Book', emoji: '📖', tmdbKeywordId: 818, parentGenres: ['drama'] },
  { id: 'based-on-true-story', name: 'True Story', emoji: '📰', tmdbKeywordId: null, parentGenres: ['drama', 'crime'] },
  { id: 'lgbtq', name: 'LGBTQ+', emoji: '🏳️‍🌈', tmdbKeywordId: 158718, parentGenres: ['drama'] },
  { id: 'female-led', name: 'Female Lead', emoji: '👩', tmdbKeywordId: null, parentGenres: ['drama', 'action'] },
  { id: 'anti-hero', name: 'Anti-Hero', emoji: '😎', tmdbKeywordId: null, parentGenres: ['drama', 'crime'] },
  { id: 'ensemble-cast', name: 'Ensemble Cast', emoji: '👥', tmdbKeywordId: null, parentGenres: ['drama', 'comedy'] },
  { id: 'anthology', name: 'Anthology', emoji: '📚', tmdbKeywordId: 157431, parentGenres: ['drama'] },
  { id: 'miniseries', name: 'Miniseries', emoji: '🎬', tmdbKeywordId: null, parentGenres: ['drama'] },
];

/**
 * Get nano-genres for a specific parent genre
 */
export function getNanoGenresForGenre(genreSlug: string): NanoGenre[] {
  return CURATED_NANO_GENRES.filter(ng => ng.parentGenres.includes(genreSlug));
}

/**
 * Get nano-genre by ID
 */
export function getNanoGenreById(id: string): NanoGenre | undefined {
  return CURATED_NANO_GENRES.find(ng => ng.id === id);
}

/**
 * Get all nano-genres
 */
export function getAllNanoGenres(): NanoGenre[] {
  return CURATED_NANO_GENRES;
}
