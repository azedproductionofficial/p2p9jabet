export default async (request, context) => {
  const url = new URL(request.url)
  const tournamentId = url.searchParams.get('tournamentId') || '17'

  const apiKey = '5676065241msh49fdc272225280ep1d817djsnab92ce4ca738'
  const host = 'allsportsapi2.p.rapidapi.com'
  const headers = {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': host,
  }

  try {
    // Step 1: Get current season ID for this tournament
    const seasonsRes = await fetch(
      `https://${host}/api/tournament/${tournamentId}/seasons`,
      { method: 'GET', headers }
    )
    const seasonsText = await seasonsRes.text()
    let seasonsData
    try {
      seasonsData = JSON.parse(seasonsText)
    } catch (e) {
      return new Response(JSON.stringify({
        error: `Seasons API returned: ${seasonsText.substring(0, 300)}`,
        events: []
      }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    // Get the most recent season
    const seasons = seasonsData.seasons || []
    if (seasons.length === 0) {
      return new Response(JSON.stringify({
        error: 'No seasons found for this tournament',
        events: []
      }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    const currentSeason = seasons[0]
    const seasonId = currentSeason.id

    // Step 2: Get next fixtures for this season
    const fixturesRes = await fetch(
      `https://${host}/api/tournament/${tournamentId}/season/${seasonId}/matches/next/0`,
      { method: 'GET', headers }
    )
    const fixturesText = await fixturesRes.text()
    let fixturesData
    try {
      fixturesData = JSON.parse(fixturesText)
    } catch (e) {
      return new Response(JSON.stringify({
        error: `Fixtures API returned: ${fixturesText.substring(0, 300)}`,
        events: []
      }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify(fixturesData), {
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
