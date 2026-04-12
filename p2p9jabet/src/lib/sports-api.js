const API_KEY = import.meta.env.VITE_RAPIDAPI_KEY
const API_HOST = 'allsportsapi2.p.rapidapi.com'
const BASE_URL = `https://${API_HOST}`

const headers = {
  'Content-Type': 'application/json',
  'x-rapidapi-key': API_KEY || '',
  'x-rapidapi-host': API_HOST,
}

// Tournament IDs for AllSportsApi
// 17 = Premier League, 679 = NPFL, 8 = La Liga, 35 = Bundesliga, 23 = Serie A
export const SUPPORTED_LEAGUES = [17, 8, 35, 23, 679]

export const LEAGUE_META = {
  17:  { name: 'Premier League 🏴󠁧󠁢󠁥󠁮󠁧󠁿', season: 61627 },
  8:   { name: 'La Liga 🇪🇸',              season: 61643 },
  35:  { name: 'Bundesliga 🇩🇪',           season: 61734 },
  23:  { name: 'Serie A 🇮🇹',              season: 61644 },
  679: { name: 'NPFL 🇳🇬',                season: 63863 },
}

export async function fetchUpcomingFixtures(tournamentId = 17) {
  const meta = LEAGUE_META[tournamentId]
  if (!meta) return []

  const res = await fetch(
    `${BASE_URL}/api/tournament/${tournamentId}/season/${meta.season}/matches/next/0`,
    { headers }
  )
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  return data.events || []
}

export function mapFixture(raw) {
  return {
    id: raw.id,
    league_id: raw.tournament?.uniqueTournament?.id || 0,
    league_name: raw.tournament?.name || 'Unknown League',
    home_team: raw.homeTeam?.name || 'Home',
    away_team: raw.awayTeam?.name || 'Away',
    home_logo: raw.homeTeam?.id
      ? `https://api.sofascore.app/api/v1/team/${raw.homeTeam.id}/image`
      : null,
    away_logo: raw.awayTeam?.id
      ? `https://api.sofascore.app/api/v1/team/${raw.awayTeam.id}/image`
      : null,
    kickoff: raw.startTimestamp
      ? new Date(raw.startTimestamp * 1000).toISOString()
      : new Date().toISOString(),
    status: raw.status?.type === 'notstarted' ? 'NS' : raw.status?.type || 'NS',
    home_goals: raw.homeScore?.current ?? null,
    away_goals: raw.awayScore?.current ?? null,
  }
}
