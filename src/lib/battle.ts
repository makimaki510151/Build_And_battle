import { ITEMS } from '../data/items'
import { REGULATIONS } from '../data/regulations'
import { ABILITIES } from '../data/skills'
import type {
  AbilityDef,
  BattleAction,
  BattleState,
  BattleUnit,
  CharacterBuild,
  TeamBuild,
} from '../types/game'
import { computeMaxHp, computeMove } from './character'
import { baseDamageAt100, formatDamageRoll, rollDamage } from './damage'

export const SNAP = 20

export function snapValue(v: number): number {
  return Math.round(v / SNAP) * SNAP
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, by - ay)
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function pushLog(state: BattleState, line: string): void {
  state.log.push(line)
}

export function createBattle(
  hostId: string,
  guestId: string,
  hostTeam: TeamBuild,
  guestTeam: TeamBuild,
  firstPlayerId: string,
  seed = Date.now(),
): BattleState {
  const reg = REGULATIONS[hostTeam.regulationId]
  const { width, height } = reg.battlefieldSize
  const marginX = 80
  const spreadY = height / 5

  const place = (team: TeamBuild, ownerId: string, side: 'left' | 'right'): BattleUnit[] =>
    team.characters.map((character, i) => {
      const x = side === 'left' ? marginX + 40 : width - marginX - 40
      const y = spreadY * (i + 1)
      return createUnit(character, ownerId, snapValue(x), snapValue(y))
    })

  const state: BattleState = {
    phase: 'playing',
    turnOwnerId: firstPlayerId,
    turnNumber: 1,
    units: [...place(hostTeam, hostId, 'left'), ...place(guestTeam, guestId, 'right')],
    winnerId: null,
    log: [],
    seed,
  }
  pushLog(state, '戦闘開始。移動・主行動は各1回。副行動（回復系）は種類ごとに1回。')
  pushLog(state, 'ダメージは基準50%±10の乱数です。')
  return state
}

export function createUnit(character: CharacterBuild, ownerId: string, x: number, y: number): BattleUnit {
  const maxHp = computeMaxHp(character)
  const itemCharges: Record<string, number> = {}
  for (const id of character.itemIds) {
    const item = ITEMS[id]
    if (item?.slot === 'consumable') itemCharges[id] = item.charges ?? 1
  }
  return {
    uid: crypto.randomUUID(),
    ownerId,
    character,
    x,
    y,
    hp: maxHp,
    maxHp,
    move: computeMove(character),
    mainUsed: false,
    moved: false,
    usedSubIds: [],
    itemCharges,
  }
}

export function aliveUnits(state: BattleState, ownerId?: string): BattleUnit[] {
  return state.units.filter((u) => u.hp > 0 && (ownerId ? u.ownerId === ownerId : true))
}

export function checkWinner(state: BattleState): string | null {
  const owners = [...new Set(state.units.map((u) => u.ownerId))]
  const surviving = owners.filter((id) => aliveUnits(state, id).length > 0)
  if (surviving.length === 1) return surviving[0]
  if (surviving.length === 0) return 'draw'
  return null
}

export function pointInAbility(
  ability: AbilityDef,
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  px: number,
  py: number,
): boolean {
  if (ability.shape === 'single') {
    return dist(tx, ty, px, py) <= 28
  }
  if (ability.shape === 'circle') {
    const cx = ability.range === 0 ? ox : tx
    const cy = ability.range === 0 ? oy : ty
    return dist(cx, cy, px, py) <= ability.aoe
  }
  if (ability.shape === 'line') {
    const len = dist(ox, oy, tx, ty) || 1
    const ux = (tx - ox) / len
    const uy = (ty - oy) / len
    const vx = px - ox
    const vy = py - oy
    const proj = vx * ux + vy * uy
    if (proj < 0 || proj > Math.min(len, ability.range)) return false
    const perp = Math.abs(vx * uy - vy * ux)
    return perp <= ability.aoe
  }
  if (ability.shape === 'cone') {
    const maxR = ability.range
    const d = dist(ox, oy, px, py)
    if (d > maxR || d < 1) return false
    const aim = Math.atan2(ty - oy, tx - ox)
    const ang = Math.atan2(py - oy, px - ox)
    let diff = Math.abs(ang - aim)
    while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2)
    const half = ((ability.coneAngle ?? 60) * Math.PI) / 180 / 2
    return diff <= half
  }
  return false
}

/** 現在位置から照準したとき、射程内に有効な対象がいるか */
export function hasValidAbilityTarget(
  state: BattleState,
  unit: BattleUnit,
  ability: AbilityDef,
): boolean {
  for (const target of state.units) {
    if (target.hp <= 0) continue
    if (ability.heal) {
      if (target.ownerId !== unit.ownerId) continue
    } else if (target.ownerId === unit.ownerId) {
      continue
    }
    if (ability.range > 0 && dist(unit.x, unit.y, target.x, target.y) > ability.range + 0.1) {
      continue
    }
    if (pointInAbility(ability, unit.x, unit.y, target.x, target.y, target.x, target.y)) {
      return true
    }
  }
  return false
}

export function canMoveTo(state: BattleState, unit: BattleUnit, x: number, y: number): boolean {
  if (unit.moved || unit.hp <= 0) return false
  const reg = battlefieldFromUnits(state)
  const sx = snapValue(x)
  const sy = snapValue(y)
  if (sx < 30 || sy < 30 || sx > reg.width - 30 || sy > reg.height - 30) return false
  if (dist(unit.x, unit.y, sx, sy) > unit.move + 0.1) return false
  const blocked = state.units.some(
    (u) => u.uid !== unit.uid && u.hp > 0 && dist(u.x, u.y, sx, sy) < 36,
  )
  return !blocked
}

function battlefieldFromUnits(state: BattleState): { width: number; height: number } {
  let maxX = 1000
  let maxY = 700
  for (const u of state.units) {
    maxX = Math.max(maxX, u.x + 80)
    maxY = Math.max(maxY, u.y + 80)
  }
  return { width: Math.max(900, Math.ceil(maxX / 20) * 20), height: Math.max(640, Math.ceil(maxY / 20) * 20) }
}

export function applyAction(
  state: BattleState,
  playerId: string,
  action: BattleAction,
): BattleState {
  if (state.phase !== 'playing' || state.turnOwnerId !== playerId) return state
  const next: BattleState = structuredClone(state)

  if (action.kind === 'end_turn') {
    for (const u of next.units) {
      if (u.ownerId === playerId) {
        u.mainUsed = false
        u.moved = false
        u.usedSubIds = []
      }
    }
    const owners = [...new Set(next.units.map((u) => u.ownerId))]
    const other = owners.find((id) => id !== playerId) ?? playerId
    next.turnOwnerId = other
    next.turnNumber += 1
    pushLog(next, `ターン${next.turnNumber}: 手番交代`)
    return next
  }

  const unit = next.units.find((u) => u.uid === action.unitUid)
  if (!unit || unit.ownerId !== playerId || unit.hp <= 0) return state

  if (action.kind === 'move') {
    if (!canMoveTo(next, unit, action.x, action.y)) return state
    unit.x = snapValue(action.x)
    unit.y = snapValue(action.y)
    unit.moved = true
    pushLog(next, `${unit.character.name} が移動`)
    return next
  }

  if (action.kind === 'wait') {
    pushLog(next, `${unit.character.name} の操作を終了`)
    return finishIfNeeded(next)
  }

  if (action.kind === 'item') {
    const charges = unit.itemCharges[action.itemId] ?? 0
    const item = ITEMS[action.itemId]
    if (!item || charges <= 0 || !item.healAmount) return state
    // 消耗品も副行動扱い：同一アイテムIDはターンに1回
    if (unit.usedSubIds.includes(`item:${action.itemId}`)) return state
    const target = next.units.find(
      (u) => u.hp > 0 && dist(u.x, u.y, action.tx, action.ty) <= 28,
    )
    if (!target || target.ownerId !== playerId) return state
    target.hp = Math.min(target.maxHp, target.hp + item.healAmount)
    unit.itemCharges[action.itemId] = charges - 1
    unit.usedSubIds.push(`item:${action.itemId}`)
    pushLog(next, `${unit.character.name} が ${item.name} を使用 → ${target.character.name}`)
    return finishIfNeeded(next)
  }

  if (action.kind === 'ability') {
    if (!unit.character.abilityIds.includes(action.abilityId)) return state
    const ability = ABILITIES[action.abilityId]
    if (!ability) return state
    if (ability.actionType === 'main' && unit.mainUsed) return state
    if (ability.actionType === 'sub' && unit.usedSubIds.includes(ability.id)) return state

    if (ability.requiredWeapon) {
      const ok = unit.character.itemIds.some(
        (id) => ITEMS[id]?.weaponType === ability.requiredWeapon,
      )
      if (!ok) return state
    }

    if (!hasValidAbilityTarget(next, unit, ability)) return state

    const tx = snapValue(action.tx)
    const ty = snapValue(action.ty)
    const reach = ability.range === 0 ? 0 : dist(unit.x, unit.y, tx, ty)
    if (ability.range > 0 && reach > ability.range + 0.1) return state

    const base = baseDamageAt100(unit.character, ability)
    const rolled = rollDamage(base, next.seed)
    next.seed = rolled.nextSeed
    const amount = rolled.damage

    let hits = 0
    for (const target of next.units) {
      if (target.hp <= 0) continue
      if (!pointInAbility(ability, unit.x, unit.y, tx, ty, target.x, target.y)) continue
      if (ability.heal) {
        if (target.ownerId !== playerId) continue
        target.hp = Math.min(target.maxHp, target.hp + amount)
        hits++
      } else {
        if (target.ownerId === playerId) continue
        target.hp = Math.max(0, target.hp - amount)
        hits++
      }
    }

    if (hits === 0) return state

    if (ability.actionType === 'main') unit.mainUsed = true
    if (ability.actionType === 'sub') unit.usedSubIds.push(ability.id)

    const kind = ability.actionType === 'main' ? '主' : '副'
    pushLog(
      next,
      `${unit.character.name} の ${ability.name}[${kind}] ${formatDamageRoll(rolled)} → ${amount}${ability.heal ? '回復' : 'dmg'}×${hits}`,
    )
    return finishIfNeeded(next)
  }

  return state
}

function finishIfNeeded(state: BattleState): BattleState {
  const winner = checkWinner(state)
  if (winner) {
    state.phase = 'ended'
    state.winnerId = winner
    pushLog(state, winner === 'draw' ? '相打ち' : '戦闘終了')
  }
  return state
}

export function decideInitiative(
  hostPrefersFirst: boolean,
  guestPrefersFirst: boolean,
  seed: number,
): { firstIsHost: boolean; method: 'host' | 'guest' | 'coin' } {
  if (hostPrefersFirst && !guestPrefersFirst) return { firstIsHost: true, method: 'host' }
  if (!hostPrefersFirst && guestPrefersFirst) return { firstIsHost: false, method: 'guest' }
  const rng = mulberry32(seed)
  return { firstIsHost: rng() < 0.5, method: 'coin' }
}

export function getBattlefieldSize(regulationId: keyof typeof REGULATIONS) {
  return REGULATIONS[regulationId].battlefieldSize
}
