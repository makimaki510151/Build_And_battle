import type { TeamBuild } from '../types/game'

const KEY = 'bab.teams.v1'
const NAME_KEY = 'bab.playerName'

export function loadTeams(): TeamBuild[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TeamBuild[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveTeams(teams: TeamBuild[]): void {
  localStorage.setItem(KEY, JSON.stringify(teams))
}

export function upsertTeam(team: TeamBuild): TeamBuild[] {
  const teams = loadTeams()
  const idx = teams.findIndex((t) => t.id === team.id)
  const next = { ...team, updatedAt: Date.now() }
  if (idx >= 0) teams[idx] = next
  else teams.unshift(next)
  saveTeams(teams)
  return teams
}

export function deleteTeam(id: string): TeamBuild[] {
  const teams = loadTeams().filter((t) => t.id !== id)
  saveTeams(teams)
  return teams
}

export function loadPlayerName(): string {
  return localStorage.getItem(NAME_KEY) || '指揮官'
}

export function savePlayerName(name: string): void {
  localStorage.setItem(NAME_KEY, name.trim() || '指揮官')
}
