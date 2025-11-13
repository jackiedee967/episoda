export async function GET(request: Request, { id }: { id: string }) {
  const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;
  
  if (!TRAKT_CLIENT_ID) {
    console.error('TRAKT_CLIENT_ID not found in environment');
    return Response.json({ error: 'API configuration error' }, { status: 500 });
  }

  try {
    const response = await fetch(
      `https://api.trakt.tv/shows/${id}/seasons?extended=full`,
      {
        headers: {
          'Content-Type': 'application/json',
          'trakt-api-version': '2',
          'trakt-api-key': TRAKT_CLIENT_ID,
        },
      }
    );

    if (!response.ok) {
      console.error(`Trakt API error: ${response.status} ${response.statusText}`);
      return Response.json(
        { error: `Trakt API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching seasons:', error);
    return Response.json({ error: 'Failed to fetch seasons' }, { status: 500 });
  }
}
