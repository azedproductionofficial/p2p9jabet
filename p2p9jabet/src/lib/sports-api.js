const API_KEY = import.meta.env.VITE_RAPIDAPI_KEY
const API_HOST = import.meta.env.VITE_RAPIDAPI_HOST || 'api-football-v1.p.rapidapi.com'

const BASE_URL = `https://${API_HOST}`

const headers = {
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': API_HOST,
}

// Fetch upcoming fixtures for supported leagues
// League IDs: 39=EPL, 235=NPFL, 140=La Liga, 78=Bundesliga, 135=Serie A
export const SUPPORTED_LEAGUES = [39, 235, 140, 78, 135]

export async function fetchUpcomingFixtures(leagueId = 39, season = 2024) {
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const res = await fetch(
    `${BASE_URL}/fixtures?league=${leagueId}&season=${season}&from=${today}&to=${nextWeek}&status=NS`,
    { headers }
  )
  const data = await res.json()
  return data.response || []
}

export async function fetchFixtureResult(fixtureId) {
  const res = await fetch(`${BASE_URL}/fixtures?id=${fixtureId}`, { headers })
  const data = await res.json()
  return data.response?.[0] || null
}

export function mapFixture(raw) {
  return {
    id: raw.fixture.id,
    league_id: raw.league.id,
    league_name: raw.league.name,
    home_team: raw.teams.home.name,
    away_team: raw.teams.away.name,
    home_logo: raw.teams.home.logo,
    away_logo: raw.teams.away.logo,
    kickoff: raw.fixture.date,
    status: raw.fixture.status.short,
    home_goals: raw.goals.home,
    away_goals: raw.goals.away,
  }
}
