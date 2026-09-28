import { useMemo, useState } from 'react'
import { BattleView } from './components/BattleView'
import { MatchLobby, type MatchResult } from './components/MatchLobby'
import { TeamBuilder } from './components/TeamBuilder'
import { REGULATIONS, REGULATION_LIST } from './data/regulations'
import { createEmptyTeam, isTeamReady, summarizeBuild } from './lib/character'
import { createLocalMirrorConnection } from './lib/localMatch'
import { createNpcEncounter } from './lib/npcTeams'
import { createSampleTeam } from './lib/sampleTeam'
import {
  deleteTeam,
  loadPlayerName,
  loadTeams,
  savePlayerName,
  upsertTeam,
} from './lib/storage'
import type { RegulationId, TeamBuild } from './types/game'
import './App.css'

type View =
  | { name: 'home' }
  | { name: 'builder'; team: TeamBuild }
  | { name: 'match' }
  | { name: 'battle'; match: MatchResult }

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' })
  const [teams, setTeams] = useState<TeamBuild[]>(() => loadTeams())
  const [playerName, setPlayerName] = useState(() => loadPlayerName())
  const [filter, setFilter] = useState<RegulationId | 'all'>('all')

  const visible = useMemo(
    () => (filter === 'all' ? teams : teams.filter((t) => t.regulationId === filter)),
    [teams, filter],
  )

  const startNew = (regulationId: RegulationId) => {
    const team = createEmptyTeam(regulationId, `${REGULATIONS[regulationId].name}部隊`)
    setView({ name: 'builder', team })
  }

  const saveCurrent = (team: TeamBuild) => {
    const next = upsertTeam(team)
    setTeams(next)
    setView({ name: 'home' })
  }

  /** 自部隊 vs 同レギュ NPC */
  const startNpcBattle = (team: TeamBuild) => {
    const encounter = createNpcEncounter(team.regulationId)
    const localId = crypto.randomUUID()
    const remoteId = crypto.randomUUID()
    const connection = createLocalMirrorConnection()
    const match: MatchResult = {
      role: 'host',
      roomCode: 'NPC',
      localPlayerId: localId,
      remotePlayerId: remoteId,
      localName: playerName,
      remoteName: encounter.commanderName,
      localTeam: team,
      remoteTeam: encounter.team,
      connection,
      preferFirst: true,
      remotePreferFirst: false,
      isNpcBattle: true,
    }
    setView({ name: 'battle', match })
  }

  /** レギュカードから即テスト：サンプル部隊で NPC 戦 */
  const startNpcDemo = (regulationId: RegulationId) => {
    const team = createSampleTeam(regulationId)
    startNpcBattle(team)
  }

  const goHome = () => setView({ name: 'home' })

  return (
    <div className="app-shell">
      <div className="atmosphere" aria-hidden />
      {view.name !== 'home' && (
        <nav className="top-nav">
          <button type="button" className="brand-link" onClick={goHome}>
            Build & Battle
          </button>
        </nav>
      )}
      {view.name === 'home' && (
        <main className="home">
          <header className="hero">
            <p className="brand">Build & Battle</p>
            <h1>部隊を組み、戦場で配する</h1>
            <p className="lede">
              レギュレーションに沿って4体をビルドし、円と直線で測るSRPG風リアルタイム対戦へ。
            </p>
            <div className="hero-actions">
              <button type="button" className="primary" onClick={() => setView({ name: 'match' })}>
                対戦する
              </button>
              <label className="name-field">
                指揮官名
                <input
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value)
                    savePlayerName(e.target.value)
                  }}
                />
              </label>
            </div>
          </header>

          <section className="section">
            <div className="section-head">
              <h2>レギュレーション</h2>
              <p>総経験値・技能上限・資産で、戦術の幅が変わります。</p>
            </div>
            <div className="reg-grid">
              {REGULATION_LIST.map((r) => {
                const npc = createNpcEncounter(r.id)
                return (
                  <article key={r.id} className="reg-card">
                    <h3>{r.name}</h3>
                    <p>{r.description}</p>
                    <ul>
                      <li>チーム経験値 {r.teamXp}</li>
                      <li>技能上限 Lv{r.maxSkillLevel}</li>
                      <li>総資産 {r.teamAssets}G</li>
                    </ul>
                    <div className="npc-box">
                      <p className="eyebrow">テストプレイ NPC</p>
                      <strong>{npc.team.name}</strong>
                      <p className="hint">{npc.blurb}</p>
                      <button type="button" className="accent" onClick={() => startNpcDemo(r.id)}>
                        NPC戦を試す
                      </button>
                    </div>
                    <button type="button" onClick={() => startNew(r.id)}>
                      この規則で部隊作成
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        const team = createSampleTeam(r.id)
                        setTeams(upsertTeam(team))
                      }}
                    >
                      サンプル部隊を追加
                    </button>
                  </article>
                )
              })}
            </div>
          </section>

          <section className="section">
            <div className="section-head">
              <h2>保存済み部隊</h2>
              <div className="chip-row">
                <button
                  type="button"
                  className={filter === 'all' ? 'chip active' : 'chip'}
                  onClick={() => setFilter('all')}
                >
                  すべて
                </button>
                {REGULATION_LIST.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={filter === r.id ? 'chip active' : 'chip'}
                    onClick={() => setFilter(r.id)}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 ? (
              <p className="empty">まだ部隊がありません。上のレギュレーションから作成してください。</p>
            ) : (
              <div className="team-list">
                {visible.map((team) => (
                  <article key={team.id} className="team-row">
                    <div>
                      <p className="eyebrow">{REGULATIONS[team.regulationId].name}</p>
                      <h3>{team.name}</h3>
                      <p className="hint">
                        {team.characters.map((c) => summarizeBuild(c)).join(' ｜ ')}
                      </p>
                      {!isTeamReady(team) && <p className="warn">未完成（各キャラに技能とスキルが必要）</p>}
                    </div>
                    <div className="cta-col">
                      <button
                        type="button"
                        onClick={() => setView({ name: 'builder', team: structuredClone(team) })}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        className="accent"
                        disabled={!isTeamReady(team)}
                        onClick={() => startNpcBattle(team)}
                      >
                        NPC戦
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => setTeams(deleteTeam(team.id))}
                      >
                        削除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      {view.name === 'builder' && (
        <TeamBuilder
          team={view.team}
          onChange={(team) => setView({ name: 'builder', team })}
          onBack={goHome}
          onSave={() => saveCurrent(view.team)}
        />
      )}

      {view.name === 'match' && (
        <MatchLobby
          teams={teams}
          playerName={playerName}
          onBack={goHome}
          onMatched={(match) => setView({ name: 'battle', match })}
        />
      )}

      {view.name === 'battle' && (
        <BattleView
          {...view.match}
          isNpcBattle={view.match.isNpcBattle}
          onExit={() => {
            void view.match.connection.destroy()
            goHome()
          }}
        />
      )}
    </div>
  )
}
