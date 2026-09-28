import { ABILITIES } from '../data/skills'
import type { AbilityDef, BattleState, BattleUnit } from '../types/game'
import { applyAction, canMoveTo, dist, hasValidAbilityTarget, snapValue } from './battle'
import { getEffectiveMove, isBuffKind } from './status'

/**
 * テストプレイ用の簡易 AI。
 * 移動1・主行動1・副行動（回復／バフ／デバフ・種類ごと1回）。
 */
export function runSimpleNpcTurn(
  state: BattleState,
  aiPlayerId: string,
  humanPlayerId: string,
): BattleState {
  let cur = state
  const myUnits = () => cur.units.filter((u) => u.ownerId === aiPlayerId && u.hp > 0)

  for (const unit of myUnits()) {
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
  if (!unit() || unit().hp <= 0) return cur

  const allies = () => cur.units.filter((u) => u.ownerId === aiPlayerId && u.hp > 0)
  const foes = () => cur.units.filter((u) => u.ownerId === humanPlayerId && u.hp > 0)
  if (foes().length === 0) return cur

  // 副: 回復
  const healId = pickAbility(
    unit(),
    (a) => !!a.heal && a.actionType === 'sub' && !unit().usedSubIds.includes(a.id),
  )
  if (healId) {
    const ab = ABILITIES[healId]
    const wounded = allies()
      .filter((a) => a.hp < a.maxHp * 0.55)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]
    if (wounded && ab && hasValidAbilityTarget(cur, unit(), ab)) {
      cur = applyAction(cur, aiPlayerId, {
        kind: 'ability',
        unitUid,
        abilityId: healId,
        tx: wounded.x,
        ty: wounded.y,
      })
    }
  }

  // 副: デバフ
  const debuffId = pickAbility(
    unit(),
    (a) =>
      a.actionType === 'sub' &&
      !!a.statusEffect &&
      !isBuffKind(a.statusEffect.kind) &&
      !unit().usedSubIds.includes(a.id),
  )
  if (debuffId) {
    const ab = ABILITIES[debuffId]
    const foe = foes().sort(
      (a, b) => dist(unit().x, unit().y, a.x, a.y) - dist(unit().x, unit().y, b.x, b.y),
    )[0]
    if (ab && foe && hasValidAbilityTarget(cur, unit(), ab)) {
      cur = applyAction(cur, aiPlayerId, {
        kind: 'ability',
        unitUid,
        abilityId: debuffId,
        tx: foe.x,
        ty: foe.y,
      })
    }
  }

  // 副: バフ
  const buffId = pickAbility(
    unit(),
    (a) =>
      a.actionType === 'sub' &&
      !!a.statusEffect &&
      isBuffKind(a.statusEffect.kind) &&
      !unit().usedSubIds.includes(a.id),
  )
  if (buffId) {
    const ab = ABILITIES[buffId]
    const ally = allies()[0]
    if (ab && ally && hasValidAbilityTarget(cur, unit(), ab)) {
      cur = applyAction(cur, aiPlayerId, {
        kind: 'ability',
        unitUid,
        abilityId: buffId,
        tx: ally.x,
        ty: ally.y,
      })
    }
  }

  const target = foes().sort(
    (a, b) => dist(unit().x, unit().y, a.x, a.y) - dist(unit().x, unit().y, b.x, b.y),
  )[0]
  if (!target) return cur

  const attackId = pickAbility(
    unit(),
    (a) => !a.heal && !a.statusEffect && a.actionType === 'main' && !unit().mainUsed,
  )
  const attack = attackId ? ABILITIES[attackId] : null

  if (attack && !unit().moved && dist(unit().x, unit().y, target.x, target.y) > attack.range) {
    const dest = stepToward(unit(), target, cur)
    if (dest) {
      cur = applyAction(cur, aiPlayerId, { kind: 'move', unitUid, x: dest.x, y: dest.y })
    }
  }

  if (
    attack &&
    !unit().mainUsed &&
    hasValidAbilityTarget(cur, unit(), attack) &&
    dist(unit().x, unit().y, target.x, target.y) <= attack.range + 8
  ) {
    cur = applyAction(cur, aiPlayerId, {
      kind: 'ability',
      unitUid,
      abilityId: attack.id,
      tx: target.x,
      ty: target.y,
    })
  }

  if (!unit().moved) {
    const dest = stepToward(unit(), target, cur)
    if (dest) {
      cur = applyAction(cur, aiPlayerId, { kind: 'move', unitUid, x: dest.x, y: dest.y })
    }
  }

  return cur
}

function pickAbility(unit: BattleUnit, pred: (a: AbilityDef) => boolean): string | null {
  const options = unit.character.abilityIds
    .map((id) => ABILITIES[id])
    .filter((a): a is AbilityDef => !!a && pred(a))
  if (!options.length) return null
  options.sort((a, b) => b.power - a.power)
  return options[0].id
}

function stepToward(
  unit: BattleUnit,
  target: BattleUnit,
  state: BattleState,
): { x: number; y: number } | null {
  const dx = target.x - unit.x
  const dy = target.y - unit.y
  const len = Math.hypot(dx, dy) || 1
  const reach = Math.min(getEffectiveMove(unit), len - 50)
  if (reach < 20) return null
  const tx = snapValue(unit.x + (dx / len) * reach)
  const ty = snapValue(unit.y + (dy / len) * reach)
  if (canMoveTo(state, unit, tx, ty)) return { x: tx, y: ty }

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
