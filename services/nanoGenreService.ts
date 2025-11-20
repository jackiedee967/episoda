import { searchShowByName, getShowKeywords } from './tmdb';

export interface NanoGenre {
  id: number;
  name: string;
  frequency: number;
}

interface ShowInfo {
  title: string;
  year: number | null;
}

// Generic keywords to filter out (boring/non-thematic)
const GENERIC_KEYWORDS = new Set([
  'based on novel',
  'based on book',
  'based on comic',
  'based on manga',
  'sequel',
  'prequel',
  'remake',
  'reboot',
  'television series',
  'tv series',
  'miniseries',
  'limited series',
  'anthology',
  'ensemble cast',
  'flashback',
  'narration',
  'voice over',
  'montage',
  'opening credits',
  'closing credits',
  'title spoken by character',
  'cameo',
  'breaking the fourth wall',
  'surprise ending',
  'twist ending',
  'cliffhanger',
  'post credits scene',
]);

/**
 * Extract TMDB keywords from user's watch history
 * Returns personalized nano-genres ranked by frequency
 */
export async function getUserNanoGenres(
  userShows: ShowInfo[],
  limit: number = 20
): Promise<NanoGenre[]> {
  if (userShows.length === 0) {
    return [];
  }

  const keywordFrequencyMap = new Map<number, { name: string; count: number }>();

  // Fetch keywords for each show the user has watched
  for (const show of userShows) {
    try {
      // Search TMDB for the show to get TMDB ID
      const tmdbShow = await searchShowByName(show.title, show.year);
      
      if (tmdbShow?.id) {
        // Fetch keywords using TMDB ID
        const keywords = await getShowKeywords(tmdbShow.id);
        
        keywords.forEach((keywordName: string) => {
          const keywordLower = keywordName.toLowerCase();
          
          // Skip generic/boring keywords
          if (GENERIC_KEYWORDS.has(keywordLower)) {
            return;
          }

          // Use keyword name as ID (we don't have keyword IDs from this endpoint)
          const keywordId = keywordName.toLowerCase().replace(/\s+/g, '-');
          
          const existing = keywordFrequencyMap.get(keywordId as any);
          if (existing) {
            existing.count++;
          } else {
            keywordFrequencyMap.set(keywordId as any, {
              name: keywordName,
              count: 1
            });
          }
        });
      }
    } catch (error) {
      console.warn(`Failed to fetch keywords for "${show.title}":`, error);
    }
  }

  // Convert to array and sort by frequency
  const rankedKeywords = Array.from(keywordFrequencyMap.entries())
    .map(([id, data]) => ({
      id: typeof id === 'string' ? id.charCodeAt(0) : id,
      name: data.name,
      frequency: data.count
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, limit);

  console.log(`🎯 Generated ${rankedKeywords.length} nano-genres from ${userShows.length} shows`);
  if (rankedKeywords.length > 0) {
    console.log(`  Top 5: ${rankedKeywords.slice(0, 5).map(k => `${k.name} (${k.frequency})`).join(', ')}`);
  }

  return rankedKeywords;
}

/**
 * Get emoji for a nano-genre keyword
 */
export function getNanoGenreEmoji(keyword: string): string {
  const keywordLower = keyword.toLowerCase();
  
  const emojiMap: { [key: string]: string } = {
    // Sci-Fi & Technology
    'aliens': '👽',
    'alien': '👽',
    'space': '🚀',
    'spacecraft': '🚀',
    'time travel': '⏰',
    'artificial intelligence': '🤖',
    'robot': '🤖',
    'dystopia': '🏚️',
    'post-apocalyptic': '☢️',
    'cyberpunk': '🌃',
    'virtual reality': '🥽',
    
    // Crime & Mystery
    'detective': '🔍',
    'investigation': '🔍',
    'mystery': '🔍',
    'murder': '🔪',
    'serial killer': '🔪',
    'crime boss': '👔',
    'mafia': '🤵',
    'drug trade': '💊',
    'drug dealer': '💊',
    'police': '👮',
    'fbi': '🕵️',
    'spy': '🕵️',
    'espionage': '🕵️',
    'undercover': '🎭',
    'heist': '💰',
    'money laundering': '💰',
    
    // Drama & Relationships
    'coming of age': '🌱',
    'love triangle': '💔',
    'romance': '💕',
    'family drama': '👨‍👩‍👧',
    'friendship': '🤝',
    'betrayal': '🗡️',
    'revenge': '😤',
    'redemption': '🙏',
    'moral ambiguity': '😈',
    
    // Horror & Supernatural
    'supernatural': '👻',
    'ghost': '👻',
    'vampire': '🧛',
    'zombie': '🧟',
    'werewolf': '🐺',
    'demon': '😈',
    'possession': '👿',
    'haunted house': '🏚️',
    'curse': '🔮',
    'witch': '🧙‍♀️',
    'magic': '✨',
    
    // Action & Adventure
    'superhero': '🦸',
    'martial arts': '🥋',
    'sword fight': '⚔️',
    'war': '⚔️',
    'battle': '⚔️',
    'survival': '🏕️',
    'apocalypse': '☢️',
    'disaster': '🌋',
    
    // Life & Society
    'high school': '🎓',
    'college': '🎓',
    'hospital': '🏥',
    'doctor': '👨‍⚕️',
    'lawyer': '⚖️',
    'politics': '🏛️',
    'corporate': '💼',
    'workplace': '💼',
    'journalism': '📰',
    
    // Psychological & Emotional
    'mental illness': '🧠',
    'psychology': '🧠',
    'trauma': '💔',
    'addiction': '💊',
    'grief': '😢',
    'identity crisis': '🎭',
    
    // Other Themes
    'conspiracy': '🔺',
    'time loop': '🔁',
    'parallel universe': '🌌',
    'dimension': '🌀',
    'prophecy': '📜',
    'chosen one': '⭐',
    'immortality': '⏳',
    'clone': '👥',
    'experiment': '🧪',
    'virus': '🦠',
    'pandemic': '🦠',
  };

  // Try exact match first
  if (emojiMap[keywordLower]) {
    return emojiMap[keywordLower];
  }

  // Try partial matches for compound keywords
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (keywordLower.includes(key) || key.includes(keywordLower)) {
      return emoji;
    }
  }

  return '🎬'; // Default fallback
}
