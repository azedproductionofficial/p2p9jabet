export default async (request, context) => {
  const url = new URL(request.url)
  const tournamentId = url.searchParams.get('tournamentId') || '17'
  const season = url.searchParams.get('season') || '61627'

  // Try multiple possible env var names
  const apiKey = process.env.RAPIDAPI_KEY
    || process.env.VITE_RAPIDAPI_KEY
    || process.env.rapidapi_key
    || ''

  // Debug: show what env vars are available (remove after fixing)
  const debugKeys = Object.keys(process.env).filter(k =>
    k.toLowerCase().includes('rapid') || k.toLowerCase().includes('api')
  )

  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'No API key found',
      availableKeys: debugKeys,
      events: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

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
        error: `API returned non-JSON: ${text.substring(0, 200)}`,
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
