import { useEffect, useMemo, useRef, useState } from 'react'
import { REGULATIONS } from '../data/regulations'
import { isTeamReady, validateTeam } from '../lib/character'
import { MatchConnection, randomRoomCode } from '../lib/matchmaking'
import type { NetMessage, RegulationId, TeamBuild } from '../types/game'

export type MatchResult = {
  role: 'host' | 'guest'
  roomCode: string
  localPlayerId: string
  remotePlayerId: string
  localName: string
  remoteName: string
  localTeam: TeamBuild
  remoteTeam: TeamBuild
  connection: MatchConnection
  preferFirst: boolean
  remotePreferFirst: boolean
}

interface Props {
  teams: TeamBuild[]
  playerName: string
  onBack: () => void
  onMatched: (result: MatchResult) => void
}

type Mode = 'menu' | 'host' | 'join' | 'random' | 'initiative'

export function MatchLobby({ teams, playerName, onBack, onMatched }: Props) {
  const [mode, setMode] = useState<Mode>('menu')
  const [regulationId, setRegulationId] = useState<RegulationId>('normal')
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '')
  const [roomCode, setRoomCode] = useState('')
  const [status, setStatus] = useState('')
  const [preferFirst, setPreferFirst] = useState(true)
  const [remotePreferFirst, setRemotePreferFirst] = useState<boolean | null>(null)
  const [pending, setPending] = useState<Omit<MatchResult, 'preferFirst' | 'remotePreferFirst'> | null>(
    null,
  )
  const connRef = useRef<MatchConnection | null>(null)
  const localIdRef = useRef(crypto.randomUUID())
  const sentHello = useRef(false)
  const remoteTeamRef = useRef<TeamBuild | null>(null)
  const remoteNameRef = useRef<string | null>(null)
  const remoteIdRef = useRef<string | null>(null)
  const roleRef = useRef<'host' | 'guest'>('host')
  const codeRef = useRef('')
  const preferRef = useRef(preferFirst)

  const eligible = useMemo(
    () => teams.filter((t) => t.regulationId === regulationId && isTeamReady(t)),
    [teams, regulationId],
  )

  const selectedTeam = eligible.find((t) => t.id === teamId) ?? eligible[0]

  useEffect(() => {
    preferRef.current = preferFirst
  }, [preferFirst])

  useEffect(() => {
    return () => {
      void connRef.current?.destroy()
    }
  }, [])

  const handleMessage = (msg: NetMessage) => {
    if (msg.type === 'hello') {
      remoteTeamRef.current = msg.team
      remoteNameRef.current = msg.playerName
      remoteIdRef.current = msg.playerId
      maybeEnterInitiative()
    }
    if (msg.type === 'initiative_choice') {
      setRemotePreferFirst(msg.preferFirst)
    }
  }

  const maybeEnterInitiative = () => {
    if (!remoteTeamRef.current || !remoteNameRef.current || !remoteIdRef.current) return
    if (!selectedTeam || !connRef.current) return
    setPending({
      role: roleRef.current,
      roomCode: codeRef.current,
      localPlayerId: localIdRef.current,
      remotePlayerId: remoteIdRef.current,
      localName: playerName,
      remoteName: remoteNameRef.current,
      localTeam: selectedTeam,
      remoteTeam: remoteTeamRef.current,
      connection: connRef.current,
    })
    setMode('initiative')
    connRef.current.send({
      type: 'initiative_choice',
      playerId: localIdRef.current,
      preferFirst: preferRef.current,
    })
  }

  const bindConnection = (conn: MatchConnection, role: 'host' | 'guest', code: string) => {
    connRef.current = conn
    roleRef.current = role
    codeRef.current = code
    sentHello.current = false
  }

  const sendHelloWhenReady = (remotePeerId: string) => {
    if (!connRef.current || !selectedTeam || sentHello.current) return
    sentHello.current = true
    setStatus(`接続: ${remotePeerId.slice(0, 12)}…`)
    connRef.current.send({
      type: 'hello',
      playerId: localIdRef.current,
      playerName,
      team: selectedTeam,
    })
  }

  const startHost = async () => {
    if (!selectedTeam) return
    const code = randomRoomCode()
    setRoomCode(code)
    setMode('host')
    setStatus('シグナリング接続中…')
    const conn = new MatchConnection(handleMessage, setStatus, sendHelloWhenReady)
    bindConnection(conn, 'host', code)
    try {
      await conn.host(code)
      setStatus(`ルームコード: ${code} — 相手の参加を待っています`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'ホストに失敗')
    }
  }

  const startJoin = async () => {
    if (!selectedTeam || roomCode.trim().length < 4) return
    setMode('join')
    setStatus('参加中…')
    const code = roomCode.trim().toUpperCase()
    const conn = new MatchConnection(handleMessage, setStatus, sendHelloWhenReady)
    bindConnection(conn, 'guest', code)
    try {
      await conn.join(code)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : '参加に失敗')
    }
  }

  const startRandom = async () => {
    if (!selectedTeam) return
    setMode('random')
    setStatus('ランダムマッチング中…')
    const conn = new MatchConnection(handleMessage, setStatus, sendHelloWhenReady)
    const code = `RND-${regulationId}`
    try {
      const role = await conn.random(regulationId)
      bindConnection(conn, role, code)
      setRoomCode(code)
      setStatus(role === 'host' ? '相手を待っています…' : '相手に接続しました')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'マッチング失敗')
    }
  }

  const confirmInitiative = () => {
    if (!pending || remotePreferFirst === null) {
      pending?.connection.send({
        type: 'initiative_choice',
        playerId: localIdRef.current,
        preferFirst,
      })
      setStatus('相手の希望を待っています…')
      return
    }
    onMatched({
      ...pending,
      preferFirst,
      remotePreferFirst,
    })
  }

  useEffect(() => {
    if (mode === 'initiative' && pending && remotePreferFirst !== null) {
      // auto-proceed once both known — still require button for clarity
    }
  }, [mode, pending, remotePreferFirst])

  return (
    <div className="panel match">
      <header className="panel-head">
        <button type="button" className="ghost" onClick={onBack}>
          ← 戻る
        </button>
        <div>
          <p className="eyebrow">マッチング</p>
          <h2>対戦ロビー</h2>
        </div>
      </header>

      {mode === 'menu' && (
        <div className="match-setup">
          <label>
            レギュレーション
            <select
              value={regulationId}
              onChange={(e) => {
                const id = e.target.value as RegulationId
                setRegulationId(id)
                const next = teams.find((t) => t.regulationId === id && isTeamReady(t))
                setTeamId(next?.id ?? '')
              }}
            >
              {Object.values(REGULATIONS).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            使用チーム
            <select value={selectedTeam?.id ?? ''} onChange={(e) => setTeamId(e.target.value)}>
              {eligible.length === 0 && <option value="">有効なチームがありません</option>}
              {eligible.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          {selectedTeam && validateTeam(selectedTeam).length > 0 && (
            <p className="warn">選択チームにレギュレーション違反があります</p>
          )}

          <div className="cta-row">
            <button type="button" className="primary" disabled={!selectedTeam} onClick={startHost}>
              ルームを作成
            </button>
            <div className="join-row">
              <input
                placeholder="ルームコード"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              />
              <button type="button" disabled={!selectedTeam} onClick={startJoin}>
                コードで参加
              </button>
            </div>
            <button type="button" className="accent" disabled={!selectedTeam} onClick={startRandom}>
              ランダムマッチ
            </button>
          </div>
          <p className="hint">
            シグナリングは公開Nostrリレー（Trystero）のみ。対戦データは端末同士のWebRTC直接通信です。自前サーバー不要でGitHub
            Pagesからプレイできます。同じレギュレーションのチーム同士のみ対戦可能です。
          </p>
        </div>
      )}

      {(mode === 'host' || mode === 'join' || mode === 'random') && (
        <div className="waiting">
          <p className="status">{status}</p>
          {mode === 'host' && roomCode && (
            <p className="room-code">
              コード <strong>{roomCode}</strong>
            </p>
          )}
          <button
            type="button"
            className="ghost"
            onClick={() => {
              void connRef.current?.destroy()
              setMode('menu')
              setStatus('')
            }}
          >
            キャンセル
          </button>
        </div>
      )}

      {mode === 'initiative' && pending && (
        <div className="initiative">
          <h3>先攻希望</h3>
          <p>
            対戦相手: {pending.remoteName}（{pending.remoteTeam.name}）
          </p>
          <div className="cta-row">
            <button
              type="button"
              className={preferFirst ? 'primary' : ''}
              onClick={() => {
                setPreferFirst(true)
                pending.connection.send({
                  type: 'initiative_choice',
                  playerId: localIdRef.current,
                  preferFirst: true,
                })
              }}
            >
              先攻希望
            </button>
            <button
              type="button"
              className={!preferFirst ? 'primary' : ''}
              onClick={() => {
                setPreferFirst(false)
                pending.connection.send({
                  type: 'initiative_choice',
                  playerId: localIdRef.current,
                  preferFirst: false,
                })
              }}
            >
              後攻希望
            </button>
          </div>
          <p className="hint">
            希望が分かれた場合はその通りに、両方とも同じ希望ならコイントスで決定します。
          </p>
          <p className="status">
            相手の希望:{' '}
            {remotePreferFirst === null ? '待機中…' : remotePreferFirst ? '先攻' : '後攻'}
          </p>
          <button
            type="button"
            className="primary"
            disabled={remotePreferFirst === null}
            onClick={confirmInitiative}
          >
            戦闘開始
          </button>
        </div>
      )}
    </div>
  )
}
