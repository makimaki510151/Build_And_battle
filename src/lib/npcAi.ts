import { ABILITIES } from '../data/skills'
import type { AbilityDef, BattleState, BattleUnit } from '../types/game'
import { applyAction, canMoveTo, dist, snapValue } from './battle'

/**
 * テストプレイ用の簡易 AI。
 * 1体ずつ: 近距離の負傷味方を回復 → 接近移動 → 攻撃 → 待機。
 */
export function runSimpleNpcTurn(
  state: BattleState,
  aiPlayerId: string,
  humanPlayerId: string,
): BattleState {
  let cur = state
  const myUnits = () => cur.units.filter((u) => u.ownerId === aiPlayerId && u.hp > 0)

  for (const unit of myUnits()) {
    if (unit.acted) continue
    cur = actWithUnit(cur, unit.uid, aiPlayerId, humanPlayerId)
  }

  return applyAction(cur, aiPlayerId, { kind: 'end_turn' })
}

function actWithUnit(
  state: BattleState,
  unitUid: string,
  aiPlayerId: string,
  humanPlayerId: string,
): BattleState {
  let cur = state
  const unit = () => cur.units.find((u) => u.uid === unitUid)!
  if (!unit() || unit().hp <= 0 || unit().acted) return cur

  const allies = () => cur.units.filter((u) => u.ownerId === aiPlayerId && u.hp > 0)
  const foes = () => cur.units.filter((u) => u.ownerId === humanPlayerId && u.hp > 0)
  if (foes().length === 0) {
    return applyAction(cur, aiPlayerId, { kind: 'wait', unitUid })
  }

  // Heal wounded ally if possible
  const healId = pickHealAbility(unit())
  if (healId) {
    const wounded = allies()
      .filter((a) => a.hp < a.maxHp * 0.55)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]
    const heal = ABILITIES[healId]
    if (wounded && heal && dist(unit().x, unit().y, wounded.x, wounded.y) <= heal.range + 8) {
      return applyAction(cur, aiPlayerId, {
        kind: 'ability',
        unitUid,
        abilityId: healId,
        tx: wounded.x,
        ty: wounded.y,
      })
    }
  }

  const target = foes().sort(
    (a, b) => dist(unit().x, unit().y, a.x, a.y) - dist(unit().x, unit().y, b.x, b.y),
  )[0]

  const attackId = pickAttackAbility(unit(), target)
  const attack = attackId ? ABILITIES[attackId] : null

  // Move closer if needed
  if (attack && !unit().moved && dist(unit().x, unit().y, target.x, target.y) > attack.range) {
    const dest = stepToward(unit(), target, cur)
    if (dest) {
      cur = applyAction(cur, aiPlayerId, { kind: 'move', unitUid, x: dest.x, y: dest.y })
    }
  }

  if (unit().acted) return cur

  // Attack if in range
  if (attack && dist(unit().x, unit().y, target.x, target.y) <= attack.range + 8) {
    return applyAction(cur, aiPlayerId, {
      kind: 'ability',
      unitUid,
      abilityId: attack.id,
      tx: target.x,
      ty: target.y,
    })
  }

  // Try move then wait
  if (!unit().moved) {
    const dest = stepToward(unit(), target, cur)
    if (dest) {
      cur = applyAction(cur, aiPlayerId, { kind: 'move', unitUid, x: dest.x, y: dest.y })
    }
  }

  if (!unit().acted) {
    cur = applyAction(cur, aiPlayerId, { kind: 'wait', unitUid })
  }
  return cur
}

function pickHealAbility(unit: BattleUnit): string | null {
  for (const id of unit.character.abilityIds) {
    const a = ABILITIES[id]
    if (a?.heal) return id
  }
  return null
}

function pickAttackAbility(unit: BattleUnit, target: BattleUnit): string | null {
  const options = unit.character.abilityIds
    .map((id) => ABILITIES[id])
    .filter((a): a is AbilityDef => !!a && !a.heal)

  if (options.length === 0) return null

  const d = dist(unit.x, unit.y, target.x, target.y)
  // Prefer something that can reach now; else highest power
  const reachable = options.filter((a) => a.range >= d || a.range === 0)
  const pool = reachable.length ? reachable : options
  pool.sort((a, b) => b.power - a.power)
  return pool[0].id
}

function stepToward(
  unit: BattleUnit,
  target: BattleUnit,
  state: BattleState,
): { x: number; y: number } | null {
  const dx = target.x - unit.x
  const dy = target.y - unit.y
  const len = Math.hypot(dx, dy) || 1
  const reach = Math.min(unit.move, len - 50) // stop short of stacking
  if (reach < SNAP_MIN) return null
  const tx = snapValue(unit.x + (dx / len) * reach)
  const ty = snapValue(unit.y + (dy / len) * reach)
  if (canMoveTo(state, unit, tx, ty)) return { x: tx, y: ty }

  // Try a few angled alternatives
  for (const angle of [0.4, -0.4, 0.8, -0.8]) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const rx = (dx / len) * cos - (dy / len) * sin
    const ry = (dx / len) * sin + (dy / len) * cos
    const ax = snapValue(unit.x + rx * reach)
    const ay = snapValue(unit.y + ry * reach)
    if (canMoveTo(state, unit, ax, ay)) return { x: ax, y: ay }
  }
  return null
}

const SNAP_MIN = 20
