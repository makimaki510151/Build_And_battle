import type { AbilityDef, CharacterBuild } from '../types/game'
import { computeStats, mainLevel } from './character'

export type DamageRollResult = {
  damage: number
  /** 今回の出目％（1〜100） */
  percent: number
  nextSeed: number
}

/** 出目％の下限・上限 */
export const DAMAGE_PERCENT_MIN = 1
export const DAMAGE_PERCENT_MAX = 100

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
 * ダメージ％ = 1〜100 の一様乱数。
 * 最終ダメージ = baseAt100 × percent / 100
 */
export function rollDamage(baseAt100: number, seed: number): DamageRollResult {
  const { value: percent, next } = rollInclusive(seed, DAMAGE_PERCENT_MIN, DAMAGE_PERCENT_MAX)
  const damage = Math.max(0, Math.round((baseAt100 * percent) / 100))
  return { damage, percent, nextSeed: next }
}

export function formatDamageRoll(result: DamageRollResult): string {
  return `${result.percent}%`
}

export function actionTypeLabel(type: AbilityDef['actionType']): string {
  return type === 'main' ? '主行動' : '副行動'
}

/** min〜max の整数を一様に1つ */
function rollInclusive(
  seed: number,
  min: number,
  max: number,
): { value: number; next: number } {
  let t = (seed + 0x6d2b79f5) >>> 0
  let r = Math.imul(t ^ (t >>> 15), 1 | t)
  r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
  const next = (r ^ (r >>> 14)) >>> 0
  const span = max - min + 1
  const value = min + (next % span)
  return { value, next }
}
