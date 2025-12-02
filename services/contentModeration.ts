const HARMFUL_SLURS: string[] = [
  'nigger', 'nigga', 'n1gger', 'n1gga',
  'faggot', 'fag', 'f4ggot',
  'retard', 'retarded', 'r3tard',
  'tranny',
  'spic', 'sp1c',
  'kike', 'k1ke',
  'chink', 'ch1nk',
  'wetback',
  'beaner',
  'gook',
  'raghead',
  'towelhead',
  'coon',
  'jap',
  'dyke',
  'whore', 'wh0re',
  'slut',
  'cunt',
];

const WORD_BOUNDARY_REGEX = /[\s\.,!?;:'"()\[\]{}<>\/\\|@#$%^&*+=~`-]/;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/@/g, 'a');
}

function findSlursInText(text: string): string[] {
  const normalized = normalizeText(text);
  const foundSlurs: string[] = [];
  
  for (const slur of HARMFUL_SLURS) {
    const normalizedSlur = normalizeText(slur);
    
    const regex = new RegExp(`(^|[\\s\\.,!?;:'"()\\[\\]{}<>\\/\\\\|@#$%^&*+=~\`-])${normalizedSlur}($|[\\s\\.,!?;:'"()\\[\\]{}<>\\/\\\\|@#$%^&*+=~\`-])`, 'i');
    
    if (regex.test(normalized)) {
      foundSlurs.push(slur);
    }
  }
  
  return foundSlurs;
}

export interface ModerationResult {
  flagged: boolean;
  reason: string | null;
  detectedSlurs: string[];
}

export function checkContentForModeration(content: string): ModerationResult {
  if (!content || typeof content !== 'string') {
    return { flagged: false, reason: null, detectedSlurs: [] };
  }
  
  const detectedSlurs = findSlursInText(content);
  
  if (detectedSlurs.length > 0) {
    return {
      flagged: true,
      reason: `Detected harmful language: ${detectedSlurs.join(', ')}`,
      detectedSlurs,
    };
  }
  
  return { flagged: false, reason: null, detectedSlurs: [] };
}

export function checkPostForModeration(title: string | undefined, body: string | undefined): ModerationResult {
  const titleResult = checkContentForModeration(title || '');
  const bodyResult = checkContentForModeration(body || '');
  
  const allSlurs = [...titleResult.detectedSlurs, ...bodyResult.detectedSlurs];
  const uniqueSlurs = [...new Set(allSlurs)];
  
  if (uniqueSlurs.length > 0) {
    return {
      flagged: true,
      reason: `Detected harmful language: ${uniqueSlurs.join(', ')}`,
      detectedSlurs: uniqueSlurs,
    };
  }
  
  return { flagged: false, reason: null, detectedSlurs: [] };
}

export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, 'data_')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

export function sanitizeForDisplay(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export function containsDangerousContent(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /data:text\/html/i,
    /vbscript:/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(text));
}
