export default async (request, context) => {
  const url = new URL(request.url)
  const tournamentId = url.searchParams.get('tournamentId') || '17'
  const season = url.searchParams.get('season') || '61627'

  const apiKey = '5676065241msh49fdc272225280ep1d817djsnab92ce4ca738'
  const apiUrl = `https://allsportsapi2.p.rapidapi.com/api/tournament/${tournamentId}/season/${season}/matches/next/0`

  try {
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'allsportsapi2.p.rapidapi.com',
      },
    })

    const text = await res.text()

    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      return new Response(JSON.stringify({
        error: `API returned: ${text.substring(0, 300)}`,
        events: []
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

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
