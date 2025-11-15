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

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  // Approximate character width as 0.6 * fontSize
  const approxCharWidth = fontSize * 0.6;
  const maxCharsPerLine = Math.floor(maxWidth / approxCharWidth);
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.slice(0, 4); // Max 4 lines
}

export function generatePosterPlaceholder(title: string, width: number = 160, height: number = 240): string {
  const colorScheme = getColorSchemeForTitle(title);
  
  // P1 style: fontSize 13 with 300 weight
  const fontSize = 13;
  const lineHeight = 15.6;
  const padding = 12;
  
  // Wrap text to fit within poster
  const lines = wrapText(title, width - (padding * 2), fontSize);
  
  // Calculate starting Y position to center the text block
  const totalTextHeight = lines.length * lineHeight;
  const startY = (height - totalTextHeight) / 2 + lineHeight;
  
  // Generate text elements for each line
  const textElements = lines.map((line, index) => {
    const y = startY + (index * lineHeight);
    return `<text
        x="${width / 2}"
        y="${y}"
        font-family="Funnel Display, sans-serif"
        font-size="${fontSize}"
        font-weight="300"
        fill="${colorScheme.text}"
        text-anchor="middle"
        dominant-baseline="middle"
      >${line}</text>`;
  }).join('\n      ');
  
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg-${simpleHash(title)}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colorScheme.background};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colorScheme.background};stop-opacity:0.8" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg-${simpleHash(title)})"/>
      ${textElements}
    </svg>
  `.trim();
  
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  
  return `data:image/svg+xml,${encoded}`;
}

export function getPosterUrl(posterUrl: string | null | undefined, showTitle: string): string {
  // Return placeholder if poster is missing, null, undefined, or empty string
  if (!posterUrl || posterUrl.trim() === '') {
    return generatePosterPlaceholder(showTitle);
  }
  
  return posterUrl;
}

export function generateBackdropPlaceholder(title: string, width: number = 400, height: number = 160): string {
  const colorScheme = getColorSchemeForTitle(title);
  
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="backdrop-${simpleHash(title)}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colorScheme.background};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colorScheme.background};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#backdrop-${simpleHash(title)})"/>
    </svg>
  `.trim();
  
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  
  return `data:image/svg+xml,${encoded}`;
}

export function getBackdropUrl(backdropUrl: string | null | undefined, showTitle: string): string {
  // Return placeholder if backdrop is missing, null, undefined, or empty string
  if (!backdropUrl || backdropUrl.trim() === '') {
    return generateBackdropPlaceholder(showTitle);
  }
  
  return backdropUrl;
}
