import { useEffect, useRef, useState } from 'react'
import { ITEMS } from '../data/items'
import { WEAPON_TYPE_LABELS } from '../data/itemLabels'
import { ABILITIES } from '../data/skills'
import {
  applyAction,
  canMoveTo,
  createBattle,
  decideInitiative,
  dist,
  getBattlefieldSize,
  hasValidAbilityTarget,
  SNAP,
  snapValue,
} from '../lib/battle'
import { meetsWeaponRequirement } from '../lib/character'
import { drawUnitIcon } from '../lib/drawIcon'
import { runSimpleNpcTurn } from '../lib/npcAi'
import { actionTypeLabel, baseDamageAt100 } from '../lib/damage'
import type { MatchConnection } from '../lib/matchmaking'
import type {
  AbilityDef,
  BattleAction,
  BattleState,
  BattleUnit,
  NetMessage,
  TeamBuild,
} from '../types/game'

interface Props {
  role: 'host' | 'guest'
  localPlayerId: string
  remotePlayerId: string
  localName: string
  remoteName: string
  localTeam: TeamBuild
  remoteTeam: TeamBuild
  connection: MatchConnection
  preferFirst: boolean
  remotePreferFirst: boolean
  onExit: () => void
  isNpcBattle?: boolean
}

type SelectMode = 'none' | 'move' | 'ability' | 'item'

export function BattleView(props: Props) {
  const {
    role,
    localPlayerId,
    remotePlayerId,
    localName,
    remoteName,
    localTeam,
    remoteTeam,
    connection,
    preferFirst,
    remotePreferFirst,
    onExit,
    isNpcBattle = false,
  } = props

  const isPractice = isNpcBattle
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<BattleState | null>(null)
  const [selectedUid, setSelectedUid] = useState<string | null>(null)
  const [mode, setMode] = useState<SelectMode>('none')
  const [abilityId, setAbilityId] = useState<string | null>(null)
  const [itemId, setItemId] = useState<string | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const stateRef = useRef<BattleState | null>(null)

  const size = getBattlefieldSize(localTeam.regulationId)

  const commit = (next: BattleState, action?: { playerId: string; action: BattleAction }) => {
    stateRef.current = next
    setState(next)
    if (action) connection.send({ type: 'action', playerId: action.playerId, action: action.action })
    if (role === 'host') connection.send({ type: 'battle_sync', state: next })
  }

  const bootRef = useRef(false)

  useEffect(() => {
    if (bootRef.current) return
    bootRef.current = true

    const seed =
      [...localPlayerId, ...remotePlayerId].reduce((a, c) => a + c.charCodeAt(0), 0) ^ 0x5bd1

    const hostPref = role === 'host' ? preferFirst : remotePreferFirst
    const guestPref = role === 'host' ? remotePreferFirst : preferFirst
    const decision = decideInitiative(hostPref, guestPref, seed)
    const hostId = role === 'host' ? localPlayerId : remotePlayerId
    const guestId = role === 'host' ? remotePlayerId : localPlayerId
    const hostTeam = role === 'host' ? localTeam : remoteTeam
    const guestTeam = role === 'host' ? remoteTeam : localTeam
    const firstId = decision.firstIsHost ? hostId : guestId

    connection.setMessageHandler((msg: NetMessage) => {
      if (msg.type === 'ready' && role === 'host' && stateRef.current) {
        connection.send({ type: 'battle_sync', state: stateRef.current })
      }
      if (msg.type === 'battle_sync' && role === 'guest') {
        stateRef.current = msg.state
        setState(msg.state)
      }
      if (msg.type === 'action' && msg.playerId !== localPlayerId) {
        const cur = stateRef.current
        if (!cur) return
        const next = applyAction(cur, msg.playerId, msg.action)
        commit(next)
      }
      if (msg.type === 'resign' && msg.playerId !== localPlayerId) {
        const cur = stateRef.current
        if (!cur) return
        commit({
          ...structuredClone(cur),
          phase: 'ended',
          winnerId: localPlayerId,
          log: [...cur.log, '相手が降参しました'],
        })
      }
    })

    if (role === 'host') {
      const battle = createBattle(hostId, guestId, hostTeam, guestTeam, firstId, seed)
      const method =
        decision.method === 'coin'
          ? '希望が重なったためコイントス'
          : decision.method === 'host'
            ? 'ホスト希望により先攻決定'
            : 'ゲスト希望により先攻決定'
      battle.log.push(`${method} → 先攻プレイヤー確定`)
      commit(battle)
    } else {
      connection.send({ type: 'ready', playerId: localPlayerId })
    }
  }, [])

  // Simple NPC AI on enemy turn (test play)
  useEffect(() => {
    if (!state || !isPractice || state.phase !== 'playing') return
    if (state.turnOwnerId !== remotePlayerId) return
    const timer = window.setTimeout(() => {
      const cur = stateRef.current
      if (!cur) return
      const next = runSimpleNpcTurn(cur, remotePlayerId, localPlayerId)
      stateRef.current = next
      setState(next)
    }, 550)
    return () => clearTimeout(timer)
  }, [state, isPractice, remotePlayerId, localPlayerId])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !state) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawBattle(ctx, state, size, selectedUid, mode, abilityId, cursor, localPlayerId)
  }, [state, selectedUid, mode, abilityId, cursor, localPlayerId, size])

  // ログは上→下の時系列。追記時は最新行が見えるよう末尾へスクロール
  useEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [state?.log.length])

  const selected = state?.units.find((u) => u.uid === selectedUid) ?? null
  const myTurn = state?.turnOwnerId === localPlayerId && state.phase === 'playing'

  const dispatch = (action: BattleAction) => {
    if (!state || !myTurn) return
    const next = applyAction(state, localPlayerId, action)
    commit(next, { playerId: localPlayerId, action })
    setMode('none')
    setAbilityId(null)
    setItemId(null)
  }

  const toWorld = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * size.width
    const y = ((e.clientY - rect.top) / rect.height) * size.height
    return { x: snapValue(x), y: snapValue(y) }
  }

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!state || !myTurn) return
    const { x, y } = toWorld(e)

    if (mode === 'move' && selected) {
      if (canMoveTo(state, selected, x, y)) dispatch({ kind: 'move', unitUid: selected.uid, x, y })
      return
    }
    if (mode === 'ability' && selected && abilityId) {
      dispatch({ kind: 'ability', unitUid: selected.uid, abilityId, tx: x, ty: y })
      return
    }
    if (mode === 'item' && selected && itemId) {
      dispatch({ kind: 'item', unitUid: selected.uid, itemId, tx: x, ty: y })
      return
    }

    const hit = state.units.find((u) => u.hp > 0 && dist(u.x, u.y, x, y) <= 28)
    if (hit && hit.ownerId === localPlayerId) {
      setSelectedUid(hit.uid)
      setMode('none')
    }
  }

  if (!state) {
    return (
      <div className="panel">
        <p className="status">戦場を同期しています…</p>
      </div>
    )
  }

  return (
    <div className="panel battle">
      <header className="battle-head">
        <div>
          <p className="eyebrow">
            ターン {state.turnNumber} ／ {myTurn ? 'あなたの手番' : `${remoteName} の手番`}
            {isPractice ? '（NPC戦）' : ''}
          </p>
          <h2>
            {localName} vs {remoteName}
          </h2>
        </div>
        <div className="cta-row">
          <button
            type="button"
            disabled={!myTurn || state.phase !== 'playing'}
            onClick={() => dispatch({ kind: 'end_turn' })}
          >
            ターン終了
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              connection.send({ type: 'resign', playerId: localPlayerId })
              onExit()
            }}
          >
            退出
          </button>
        </div>
      </header>

      <div className="battle-layout">
        <canvas
          ref={canvasRef}
          width={size.width}
          height={size.height}
          className="battlefield"
          onClick={onClick}
          onMouseMove={(e) => setCursor(toWorld(e))}
          onMouseLeave={() => setCursor(null)}
        />

        <aside className="battle-side">
          {selected ? (
            <UnitPanel
              unit={selected}
              battleState={state}
              mine={selected.ownerId === localPlayerId}
              myTurn={myTurn}
              mode={mode}
              abilityId={abilityId}
              onMove={() => setMode(mode === 'move' ? 'none' : 'move')}
              onWait={() => dispatch({ kind: 'wait', unitUid: selected.uid })}
              onAbility={(id) => {
                if (mode === 'ability' && abilityId === id) {
                  setAbilityId(null)
                  setMode('none')
                  return
                }
                setAbilityId(id)
                setItemId(null)
                setMode('ability')
              }}
              onItem={(id) => {
                if (mode === 'item' && itemId === id) {
                  setItemId(null)
                  setMode('none')
                  return
                }
                setItemId(id)
                setAbilityId(null)
                setMode('item')
              }}
            />
          ) : (
            <p className="hint">
              自軍ユニットを選択。移動・主行動は各1回。副行動（回復）は種類ごとに1回。ダメージは基準50%±10。
            </p>
          )}

          <div className="log" ref={logRef}>
            {state.log.map((line, i) => (
              <p key={`${i}-${line}`}>{line}</p>
            ))}
          </div>

          {state.phase === 'ended' && (
            <div className="result">
              <h3>
                {state.winnerId === 'draw'
                  ? '引き分け'
                  : state.winnerId === localPlayerId
                    ? '勝利'
                    : '敗北'}
              </h3>
              <button type="button" className="primary" onClick={onExit}>
                ロビーへ
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function UnitPanel({
  unit,
  battleState,
  mine,
  myTurn,
  mode,
  abilityId,
  onMove,
  onWait,
  onAbility,
  onItem,
}: {
  unit: BattleUnit
  battleState: BattleState
  mine: boolean
  myTurn: boolean
  mode: SelectMode
  abilityId: string | null
  onMove: () => void
  onWait: () => void
  onAbility: (id: string) => void
  onItem: (id: string) => void
}) {
  const selectedAbility = abilityId ? ABILITIES[abilityId] : null
  return (
    <div className="unit-panel">
      <h3>{unit.character.name}</h3>
      <p>
        HP {unit.hp}/{unit.maxHp} ／ 移動 {unit.move}
      </p>
      <p>
        移動: {unit.moved ? '済' : '可'} ／ 主行動: {unit.mainUsed ? '済' : '可'} ／ 副行動: 種類ごと1回
      </p>
      {selectedAbility && (
        <p className="hint">
          {selectedAbility.name}（{actionTypeLabel(selectedAbility.actionType)}）基礎威力{' '}
          {selectedAbility.power} ／ 100%時 {baseDamageAt100(unit.character, selectedAbility)}
          {selectedAbility.heal ? '回復' : 'dmg'} ／ 出目 50%±10
        </p>
      )}
      {mine && myTurn && (
        <div className="cta-col">
          <button
            type="button"
            className={mode === 'move' ? 'primary' : ''}
            disabled={unit.moved}
            onClick={onMove}
          >
            移動
          </button>
          {unit.character.abilityIds.map((id) => {
            const ab = ABILITIES[id]
            if (!ab) return null
            const blockedMain = ab.actionType === 'main' && unit.mainUsed
            const blockedSub = ab.actionType === 'sub' && unit.usedSubIds.includes(id)
            const blockedWeapon = !meetsWeaponRequirement(unit.character, ab)
            const blockedTarget = !hasValidAbilityTarget(battleState, unit, ab)
            const blocked = blockedMain || blockedSub || blockedWeapon || blockedTarget
            return (
              <button
                key={id}
                type="button"
                className={mode === 'ability' && abilityId === id ? 'primary' : ''}
                disabled={blocked}
                onClick={() => onAbility(id)}
                title={
                  blockedTarget
                    ? '射程内に対象がいません'
                    : blockedWeapon && ab.requiredWeapon
                      ? `${WEAPON_TYPE_LABELS[ab.requiredWeapon]}が必要`
                      : blockedSub
                        ? 'この副行動は使用済み'
                        : ab.description
                }
              >
                {ab.name}
                <small>
                  {' '}
                  [{actionTypeLabel(ab.actionType)}] 100%={baseDamageAt100(unit.character, ab)}
                  {ab.requiredWeapon ? ` / ${WEAPON_TYPE_LABELS[ab.requiredWeapon]}` : ' / 武器不要'}
                </small>
              </button>
            )
          })}
          {unit.character.itemIds
            .filter((id) => ITEMS[id]?.slot === 'consumable')
            .map((id) => (
              <button
                key={id}
                type="button"
                disabled={
                  (unit.itemCharges[id] ?? 0) <= 0 || unit.usedSubIds.includes(`item:${id}`)
                }
                onClick={() => onItem(id)}
              >
                {ITEMS[id].name}×{unit.itemCharges[id] ?? 0}
                <small> [副·1回]</small>
              </button>
            ))}
          <button type="button" onClick={onWait}>
            このキャラの操作を終える
          </button>
        </div>
      )}
    </div>
  )
}


function drawBattle(
  ctx: CanvasRenderingContext2D,
  state: BattleState,
  size: { width: number; height: number },
  selectedUid: string | null,
  mode: SelectMode,
  abilityId: string | null,
  cursor: { x: number; y: number } | null,
  localPlayerId: string,
) {
  ctx.clearRect(0, 0, size.width, size.height)

  const g = ctx.createLinearGradient(0, 0, size.width, size.height)
  g.addColorStop(0, '#1c3a32')
  g.addColorStop(0.5, '#244a3c')
  g.addColorStop(1, '#1a3038')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size.width, size.height)

  ctx.strokeStyle = 'rgba(214, 190, 130, 0.06)'
  ctx.lineWidth = 1
  for (let x = 0; x <= size.width; x += SNAP * 2) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, size.height)
    ctx.stroke()
  }
  for (let y = 0; y <= size.height; y += SNAP * 2) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(size.width, y)
    ctx.stroke()
  }

  const selected = state.units.find((u) => u.uid === selectedUid) ?? null

  if (selected && mode === 'move') {
    ctx.beginPath()
    ctx.arc(selected.x, selected.y, selected.move, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(212, 175, 55, 0.12)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)'
    ctx.stroke()
  }

  if (selected && mode === 'ability' && abilityId && cursor) {
    const ability = ABILITIES[abilityId]
    if (ability) drawAbilityPreview(ctx, selected, ability, cursor.x, cursor.y)
  }

  for (const unit of state.units) {
    if (unit.hp <= 0) continue
    const mine = unit.ownerId === localPlayerId
    drawUnitIcon(ctx, unit.x, unit.y, unit.character.icon, 18, mine ? '#f0e6c8' : '#9eb7c8')
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(unit.x - 22, unit.y + 24, 44, 5)
    ctx.fillStyle = mine ? '#d4af37' : '#6fa8c9'
    ctx.fillRect(unit.x - 22, unit.y + 24, 44 * (unit.hp / unit.maxHp), 5)
    ctx.fillStyle = 'rgba(245,240,230,0.9)'
    ctx.font = '11px "Zen Kaku Gothic New", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(unit.character.name, unit.x, unit.y - 28)
    if (unit.uid === selectedUid) {
      ctx.beginPath()
      ctx.arc(unit.x, unit.y, 26, 0, Math.PI * 2)
      ctx.strokeStyle = '#f3d27a'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }
}

function drawAbilityPreview(
  ctx: CanvasRenderingContext2D,
  unit: BattleUnit,
  ability: AbilityDef,
  tx: number,
  ty: number,
) {
  ctx.save()
  ctx.fillStyle = 'rgba(220, 120, 80, 0.18)'
  ctx.strokeStyle = 'rgba(220, 140, 90, 0.7)'
  ctx.lineWidth = 2

  if (ability.range > 0) {
    ctx.beginPath()
    ctx.arc(unit.x, unit.y, ability.range, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(240, 220, 160, 0.35)'
    ctx.stroke()
    ctx.strokeStyle = 'rgba(220, 140, 90, 0.7)'
  }

  if (ability.shape === 'circle') {
    const cx = ability.range === 0 ? unit.x : tx
    const cy = ability.range === 0 ? unit.y : ty
    ctx.beginPath()
    ctx.arc(cx, cy, ability.aoe, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  } else if (ability.shape === 'line') {
    const ang = Math.atan2(ty - unit.y, tx - unit.x)
    const len = Math.min(ability.range, dist(unit.x, unit.y, tx, ty) || ability.range)
    const ex = unit.x + Math.cos(ang) * len
    const ey = unit.y + Math.sin(ang) * len
    ctx.beginPath()
    ctx.moveTo(unit.x, unit.y)
    ctx.lineTo(ex, ey)
    ctx.lineWidth = ability.aoe * 2
    ctx.strokeStyle = 'rgba(220, 140, 90, 0.35)'
    ctx.stroke()
  } else if (ability.shape === 'cone') {
    const ang = Math.atan2(ty - unit.y, tx - unit.x)
    const half = (((ability.coneAngle ?? 60) * Math.PI) / 180) / 2
    ctx.beginPath()
    ctx.moveTo(unit.x, unit.y)
    ctx.arc(unit.x, unit.y, ability.range, ang - half, ang + half)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.arc(tx, ty, 28, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}
