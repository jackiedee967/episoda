export const POSTER_COLOR_SCHEMES = [
  { id: 1, background: '#FF135E', text: '#FFF2F3' },
  { id: 2, background: '#C20081', text: '#FFE5F3' },
  { id: 3, background: '#1700C6', text: '#DEE8FF' },
  { id: 4, background: '#0F6100', text: '#DEFFA0' },
  { id: 5, background: '#9334E9', text: '#FAF5FF' },
  { id: 6, background: '#FF5E00', text: '#FFF3EF' },
  { id: 7, background: '#C20003', text: '#FFE2E2' },
  { id: 8, background: '#0EA5E9', text: '#E0F2FE' },
  { id: 9, background: '#EC4899', text: '#FCE7F3' },
  { id: 10, background: '#8B5CF6', text: '#EDE9FE' },
];

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getColorSchemeForTitle(title: string) {
  const hash = simpleHash(title.toLowerCase());
  const index = hash % POSTER_COLOR_SCHEMES.length;
  return POSTER_COLOR_SCHEMES[index];
}

function getInitials(title: string): string {
  const words = title.trim().split(/\s+/);
  
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  return words
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

export function generatePosterPlaceholder(title: string, width: number = 160, height: number = 240): string {
  const colorScheme = getColorSchemeForTitle(title);
  const initials = getInitials(title);
  
  const fontSize = width * 0.35;
  const textY = height / 2 + fontSize * 0.35;
  
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-${simpleHash(title)}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colorScheme.background};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colorScheme.background};stop-opacity:0.8" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg-${simpleHash(title)})"/>
      <text
        x="${width / 2}"
        y="${textY}"
        font-family="system-ui, -apple-system, sans-serif"
        font-size="${fontSize}"
        font-weight="700"
        fill="${colorScheme.text}"
        text-anchor="middle"
        dominant-baseline="middle"
      >${initials}</text>
    </svg>
  `.trim();
  
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  
  return `data:image/svg+xml,${encoded}`;
}

export function getPosterUrl(posterUrl: string | null | undefined, showTitle: string): string {
  if (posterUrl && posterUrl.trim() !== '') {
    return posterUrl;
  }
  
  return generatePosterPlaceholder(showTitle);
}
