export default async (request, context) => {
  const url = new URL(request.url)
  const tournamentId = url.searchParams.get('tournamentId') || '17'
  const season = url.searchParams.get('season') || '61627'

  const apiUrl = `https://allsportsapi2.p.rapidapi.com/api/tournament/${tournamentId}/season/${season}/matches/next/0`

  try {
    const res = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-key': process.env.VITE_RAPIDAPI_KEY,
        'x-rapidapi-host': 'allsportsapi2.p.rapidapi.com',
      },
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, events: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = {
  path: '/.netlify/functions/fixtures',
}
