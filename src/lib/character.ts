import { ITEMS } from '../data/items'
import { emptyStats, RACES, sumStats, totalStatPoints } from '../data/races'
import { REGULATIONS } from '../data/regulations'
import { ABILITIES, SKILL_LINES } from '../data/skills'
import type {
  CharacterBuild,
  RegulationId,
  SkillLineId,
  Stats,
  TeamBuild,
} from '../types/game'

export function createEmptyCharacter(index: number): CharacterBuild {
  return {
    id: crypto.randomUUID(),
    name: `ユニット${index + 1}`,
    raceId: 'human',
    icon: { shape: 'circle', color: 'crimson' },
    skillXp: {},
    abilityIds: [],
    bonusStats: {},
    itemIds: [],
  }
}

export function createEmptyTeam(regulationId: RegulationId, name = '無題の部隊'): TeamBuild {
  return {
    id: crypto.randomUUID(),
    name,
    regulationId,
    characters: [0, 1, 2, 3].map(createEmptyCharacter),
    updatedAt: Date.now(),
  }
}

export function skillLevel(char: CharacterBuild, line: SkillLineId): number {
  return char.skillXp[line] ?? 0
}

export function mainLevel(char: CharacterBuild): number {
  const values = Object.values(char.skillXp)
  return values.length ? Math.max(...values) : 0
}

export function usedXp(char: CharacterBuild): number {
  return Object.values(char.skillXp).reduce((a, b) => a + (b ?? 0), 0)
}

export function teamUsedXp(team: TeamBuild): number {
  return team.characters.reduce((n, c) => n + usedXp(c), 0)
}

export function teamUsedAssets(team: TeamBuild): number {
  return team.characters.reduce((sum, c) => {
    return (
      sum +
      c.itemIds.reduce((s, id) => s + (ITEMS[id]?.price ?? 0), 0)
    )
  }, 0)
}

export function activeSkillLines(char: CharacterBuild): SkillLineId[] {
  return (Object.keys(char.skillXp) as SkillLineId[]).filter(
    (id) => (char.skillXp[id] ?? 0) > 0,
  )
}

export function availableStatPoints(char: CharacterBuild, regulationId: RegulationId): number {
  const reg = REGULATIONS[regulationId]
  return mainLevel(char) * reg.statPointsPerMainLevel
}

export function remainingStatPoints(char: CharacterBuild, regulationId: RegulationId): number {
  return availableStatPoints(char, regulationId) - totalStatPoints(char.bonusStats)
}

export function computeStats(char: CharacterBuild): Stats {
  const race = RACES[char.raceId]
  let stats = sumStats(race.baseStats, char.bonusStats)
  for (const itemId of char.itemIds) {
    const item = ITEMS[itemId]
    if (item) stats = sumStats(stats, item.bonuses)
  }
  return stats
}

export function computeMaxHp(char: CharacterBuild): number {
  const stats = computeStats(char)
  const level = mainLevel(char)
  let hp = 60 + stats.vit * 4 + level * 8
  for (const itemId of char.itemIds) {
    hp += ITEMS[itemId]?.hpBonus ?? 0
  }
  return hp
}

export function computeMove(char: CharacterBuild): number {
  const stats = computeStats(char)
  let move = 110 + stats.agi * 3
  for (const itemId of char.itemIds) {
    move += ITEMS[itemId]?.moveBonus ?? 0
  }
  return Math.max(60, move)
}

export function unlockedAbilities(char: CharacterBuild): string[] {
  const unlocked: string[] = []
  for (const line of activeSkillLines(char)) {
    const level = skillLevel(char, line)
    for (const abilityId of SKILL_LINES[line].abilityIds) {
      const ability = ABILITIES[abilityId]
      if (ability && ability.requiredLevel <= level) unlocked.push(abilityId)
    }
  }
  return unlocked
}

export interface ValidationIssue {
  path: string
  message: string
}

export function validateCharacter(
  char: CharacterBuild,
  regulationId: RegulationId,
): ValidationIssue[] {
  const reg = REGULATIONS[regulationId]
  const issues: ValidationIssue[] = []
  const lines = activeSkillLines(char)

  if (!char.name.trim()) issues.push({ path: 'name', message: '名前が空です' })

  for (const line of lines) {
    const lv = skillLevel(char, line)
    if (lv > reg.maxSkillLevel) {
      issues.push({
        path: `skill:${line}`,
        message: `${SKILL_LINES[line].name}が上限Lv${reg.maxSkillLevel}を超えています`,
      })
    }
  }

  if (lines.length > reg.maxSkillLinesPerChar) {
    issues.push({
      path: 'skillLines',
      message: `技能数が上限${reg.maxSkillLinesPerChar}を超えています`,
    })
  }

  if (char.abilityIds.length > reg.maxAbilitiesPerChar) {
    issues.push({
      path: 'abilities',
      message: `取得スキル数が上限${reg.maxAbilitiesPerChar}を超えています`,
    })
  }

  const unlocked = new Set(unlockedAbilities(char))
  for (const id of char.abilityIds) {
    if (!unlocked.has(id)) {
      issues.push({ path: `ability:${id}`, message: `${ABILITIES[id]?.name ?? id}は未解禁です` })
    }
  }

  if (remainingStatPoints(char, regulationId) < 0) {
    issues.push({ path: 'stats', message: 'ステータス振りが多すぎます' })
  }

  const slots = { weapon: 0, armor: 0, accessory: 0 }
  for (const itemId of char.itemIds) {
    const item = ITEMS[itemId]
    if (!item) {
      issues.push({ path: `item:${itemId}`, message: '不明なアイテム' })
      continue
    }
    if (item.slot !== 'consumable') {
      slots[item.slot]++
      if (slots[item.slot] > 1) {
        issues.push({ path: `item:${itemId}`, message: `${item.slot}は1つまで` })
      }
    }
  }

  return issues
}

export function validateTeam(team: TeamBuild): ValidationIssue[] {
  const reg = REGULATIONS[team.regulationId]
  const issues: ValidationIssue[] = []

  if (team.characters.length !== 4) {
    issues.push({ path: 'characters', message: 'キャラは4体必要です' })
  }

  if (teamUsedXp(team) > reg.teamXp) {
    issues.push({
      path: 'xp',
      message: `経験値がチーム上限${reg.teamXp}を超えています（使用${teamUsedXp(team)}）`,
    })
  }

  if (teamUsedAssets(team) > reg.teamAssets) {
    issues.push({
      path: 'assets',
      message: `資産が上限${reg.teamAssets}を超えています（使用${teamUsedAssets(team)}）`,
    })
  }

  team.characters.forEach((c, i) => {
    for (const issue of validateCharacter(c, team.regulationId)) {
      issues.push({ path: `char${i}.${issue.path}`, message: `${c.name}: ${issue.message}` })
    }
  })

  return issues
}

export function isTeamReady(team: TeamBuild): boolean {
  if (validateTeam(team).length > 0) return false
  return team.characters.every((c) => mainLevel(c) >= 1 && c.abilityIds.length >= 1)
}

export function cloneTeam(team: TeamBuild): TeamBuild {
  return structuredClone(team)
}

export function summarizeBuild(char: CharacterBuild): string {
  const lines = activeSkillLines(char)
    .map((id) => `${SKILL_LINES[id].name}Lv${skillLevel(char, id)}`)
    .join(' / ')
  return `Lv${mainLevel(char)} ${RACES[char.raceId].name} ${lines || '未振り'}`
}

export { emptyStats }
