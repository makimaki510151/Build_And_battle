import type { AbilityDef, CharacterBuild } from '../types/game'
import { computeStats, mainLevel } from './character'

export type CascadeRollResult = {
  /** 最終ダメージ（回復量） */
  damage: number
  /** 累積％（100 で基礎威力ちょうど、それ以上もあり得る） */
  totalPercent: number
  /** 各回の出目 0〜100 */
  rolls: number[]
  /** 次に使う乱数シード */
  nextSeed: number
}

/** 100% 時の基礎ダメージ（キャラステ依存）。ビルダー／戦闘の表示用。 */
export function baseDamageAt100(character: CharacterBuild, ability: AbilityDef): number {
  const stats = computeStats(character)
  const level = mainLevel(character)
  return Math.max(
    1,
    Math.round(ability.power + stats[ability.powerStat] * 1.4 + level * 1.5),
  )
}

/**
 * 0〜100% 抽選。規定％以上なら回数無制限で連鎖し、％を加算していく。
 * ダメージ = baseAt100 × (累積％ / 100)
 */
export function rollCascadingDamage(
  baseAt100: number,
  cascadeThreshold: number,
  seed: number,
): CascadeRollResult {
  let s = seed >>> 0
  const rolls: number[] = []
  let totalPercent = 0
  const threshold = clampThreshold(cascadeThreshold)

  // 実装上の安全弁（理論上は無制限。閾値が極端に低い場合のフリーズ防止）
  const HARD_CAP = 100_000
  for (let i = 0; i < HARD_CAP; i++) {
    const { value, next } = roll0to100(s)
    s = next
    rolls.push(value)
    totalPercent += value
    if (value < threshold) break
  }

  const damage = Math.max(0, Math.round((baseAt100 * totalPercent) / 100))
  return { damage, totalPercent, rolls, nextSeed: s }
}

export function formatCascadeSummary(result: CascadeRollResult): string {
  const chain = result.rolls.map((r) => `${r}%`).join('→')
  return `${chain} 計${result.totalPercent}%`
}

export function actionTypeLabel(type: AbilityDef['actionType']): string {
  return type === 'main' ? '主行動' : '副行動'
}

function clampThreshold(t: number): number {
  if (!Number.isFinite(t)) return 100
  return Math.min(100, Math.max(0, Math.round(t)))
}

function roll0to100(seed: number): { value: number; next: number } {
  let t = (seed + 0x6d2b79f5) >>> 0
  let r = Math.imul(t ^ (t >>> 15), 1 | t)
  r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
  const next = (r ^ (r >>> 14)) >>> 0
  const value = next % 101 // 0..100 inclusive
  return { value, next }
}
