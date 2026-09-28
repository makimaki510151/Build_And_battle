import type { AbilityDef, CharacterBuild } from '../types/game'
import { computeStats, mainLevel } from './character'

export type DamageRollResult = {
  damage: number
  /** 今回の％（0〜100） */
  percent: number
  /** 基準％ */
  center: number
  nextSeed: number
}

/** 振れ幅（基準％から ± この値） */
export const DAMAGE_VARIANCE = 10

/** 基準％（固定）。出目はこの前後 ±DAMAGE_VARIANCE（0〜100にクランプ） */
export const DAMAGE_PERCENT_CENTER = 50

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
 * ダメージ％ = 固定基準 ±10（0〜100 に収める）。
 * 最終ダメージ = baseAt100 × percent / 100
 */
export function rollDamage(
  baseAt100: number,
  seed: number,
  center: number = DAMAGE_PERCENT_CENTER,
): DamageRollResult {
  const { value: delta, next } = rollVariance(seed, DAMAGE_VARIANCE)
  const percent = Math.min(100, Math.max(0, center + delta))
  const damage = Math.max(0, Math.round((baseAt100 * percent) / 100))
  return { damage, percent, center, nextSeed: next }
}

export function formatDamageRoll(result: DamageRollResult): string {
  return `${result.percent}%（基準${result.center}±${DAMAGE_VARIANCE}）`
}

export function actionTypeLabel(type: AbilityDef['actionType']): string {
  return type === 'main' ? '主行動' : '副行動'
}

/** -variance 〜 +variance の整数 */
function rollVariance(seed: number, variance: number): { value: number; next: number } {
  let t = (seed + 0x6d2b79f5) >>> 0
  let r = Math.imul(t ^ (t >>> 15), 1 | t)
  r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
  const next = (r ^ (r >>> 14)) >>> 0
  const span = variance * 2 + 1
  const value = (next % span) - variance
  return { value, next }
}
