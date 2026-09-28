import type { BattleUnit, StatusEffect, StatusKind } from '../types/game'

export const STATUS_KIND_LABELS: Record<StatusKind, string> = {
  atk_up: '攻撃↑',
  atk_down: '攻撃↓',
  def_up: '防御↑',
  def_down: '防御↓',
  move_up: '移動↑',
  move_down: '移動↓',
}

export function isBuffKind(kind: StatusKind): boolean {
  return kind === 'atk_up' || kind === 'def_up' || kind === 'move_up'
}

export function statusMagnitude(unit: BattleUnit, kind: StatusKind): number {
  return unit.statuses.find((s) => s.kind === kind)?.magnitude ?? 0
}

/** 与ダメージ倍率（攻撃↑↓） */
export function outgoingDamageFactor(unit: BattleUnit): number {
  const up = statusMagnitude(unit, 'atk_up')
  const down = statusMagnitude(unit, 'atk_down')
  return Math.max(0.2, 1 + up / 100 - down / 100)
}

/** 被ダメージ倍率（防御↑は軽減、防御↓は増加） */
export function incomingDamageFactor(unit: BattleUnit): number {
  const up = statusMagnitude(unit, 'def_up')
  const down = statusMagnitude(unit, 'def_down')
  return Math.max(0.2, 1 - up / 100 + down / 100)
}

/** 移動力（move_up/down の magnitude はピクセル加算） */
export function getEffectiveMove(unit: BattleUnit): number {
  const up = statusMagnitude(unit, 'move_up')
  const down = statusMagnitude(unit, 'move_down')
  return Math.max(40, unit.move + up - down)
}

export function formatStatuses(unit: BattleUnit): string {
  if (!unit.statuses.length) return ''
  return unit.statuses
    .map((s) => `${STATUS_KIND_LABELS[s.kind]}${formatMag(s)}(${s.turnsLeft})`)
    .join(' ')
}

function formatMag(s: StatusEffect): string {
  if (s.kind === 'move_up' || s.kind === 'move_down') return `+${s.magnitude}`
  return `${s.magnitude}%`
}

/** 同種は上書きして付与 */
export function applyStatusToUnit(unit: BattleUnit, effect: StatusEffect): void {
  unit.statuses = unit.statuses.filter((s) => s.kind !== effect.kind)
  unit.statuses.push(effect)
}

export function tickStatuses(units: BattleUnit[]): void {
  for (const u of units) {
    u.statuses = u.statuses
      .map((s) => ({ ...s, turnsLeft: s.turnsLeft - 1 }))
      .filter((s) => s.turnsLeft > 0)
  }
}
