export function convertToFiveStarRating(apiRating: number | null | undefined): number {
  if (apiRating === null || apiRating === undefined || apiRating < 0) {
    return 0;
  }

  if (apiRating >= 9.0) return 5.0;
  if (apiRating >= 8.0) return 4.5;
  if (apiRating >= 7.0) return 4.0;
  if (apiRating >= 6.0) return 3.5;
  if (apiRating >= 5.0) return 3.0;
  if (apiRating >= 4.0) return 2.5;
  if (apiRating >= 3.0) return 2.0;
  if (apiRating >= 2.0) return 1.5;
  if (apiRating >= 1.0) return 1.0;
  
  return 0.5;
}
