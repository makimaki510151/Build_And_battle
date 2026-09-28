import { useMemo, useState } from 'react'
import { ITEM_LIST, ITEMS } from '../data/items'
import { RACE_LIST, STAT_IDS, STAT_LABELS } from '../data/races'
import { REGULATIONS } from '../data/regulations'
import { ABILITIES, SKILL_LINE_LIST, SKILL_LINES } from '../data/skills'
import {
  availableStatPoints,
  computeMaxHp,
  computeMove,
  computeStats,
  mainLevel,
  remainingStatPoints,
  skillLevel,
  summarizeBuild,
  teamUsedAssets,
  teamUsedXp,
  unlockedAbilities,
  validateTeam,
} from '../lib/character'
import type { CharacterBuild, SkillLineId, TeamBuild } from '../types/game'
import { IconPicker } from './IconPicker'

interface Props {
  team: TeamBuild
  onChange: (team: TeamBuild) => void
  onBack: () => void
  onSave: () => void
}

export function TeamBuilder({ team, onChange, onBack, onSave }: Props) {
  const [selected, setSelected] = useState(0)
  const reg = REGULATIONS[team.regulationId]
  const char = team.characters[selected]
  const issues = useMemo(() => validateTeam(team), [team])
  const stats = computeStats(char)
  const unlocked = unlockedAbilities(char)
  const remStats = remainingStatPoints(char, team.regulationId)

  const updateChar = (patch: Partial<CharacterBuild>) => {
    const characters = team.characters.map((c, i) => (i === selected ? { ...c, ...patch } : c))
    onChange({ ...team, characters })
  }

  const setSkillXp = (line: SkillLineId, value: number) => {
    const skillXp = { ...char.skillXp }
    const v = Math.max(0, Math.min(reg.maxSkillLevel, value))
    if (v === 0) delete skillXp[line]
    else skillXp[line] = v
    // drop abilities no longer unlocked
    const next = { ...char, skillXp }
    const ok = new Set(unlockedAbilities(next))
    updateChar({
      skillXp,
      abilityIds: char.abilityIds.filter((id) => ok.has(id)),
    })
  }

  const toggleAbility = (id: string) => {
    if (char.abilityIds.includes(id)) {
      updateChar({ abilityIds: char.abilityIds.filter((a) => a !== id) })
      return
    }
    if (char.abilityIds.length >= reg.maxAbilitiesPerChar) return
    updateChar({ abilityIds: [...char.abilityIds, id] })
  }

  const setBonus = (stat: keyof typeof stats, delta: number) => {
    const current = char.bonusStats[stat] ?? 0
    const nextVal = Math.max(0, current + delta)
    if (delta > 0 && remStats <= 0) return
    updateChar({ bonusStats: { ...char.bonusStats, [stat]: nextVal } })
  }

  const toggleItem = (itemId: string) => {
    const item = ITEMS[itemId]
    if (!item) return
    if (char.itemIds.includes(itemId)) {
      updateChar({ itemIds: char.itemIds.filter((id) => id !== itemId) })
      return
    }
    let itemIds = [...char.itemIds]
    if (item.slot !== 'consumable') {
      itemIds = itemIds.filter((id) => ITEMS[id]?.slot !== item.slot)
    }
    updateChar({ itemIds: [...itemIds, itemId] })
  }

  return (
    <div className="panel builder">
      <header className="panel-head">
        <button type="button" className="ghost" onClick={onBack}>
          ← 戻る
        </button>
        <div>
          <p className="eyebrow">{reg.name}レギュレーション</p>
          <input
            className="title-input"
            value={team.name}
            onChange={(e) => onChange({ ...team, name: e.target.value })}
          />
        </div>
        <button type="button" className="primary" onClick={onSave}>
          保存
        </button>
      </header>

      <div className="budget-bar">
        <span>
          経験値 {teamUsedXp(team)} / {reg.teamXp}
        </span>
        <span>
          資産 {teamUsedAssets(team)} / {reg.teamAssets}
        </span>
        <span>
          技能上限 Lv{reg.maxSkillLevel} / 技能数{reg.maxSkillLinesPerChar} / スキル
          {reg.maxAbilitiesPerChar}
        </span>
      </div>

      <div className="char-tabs">
        {team.characters.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={selected === i ? 'char-tab active' : 'char-tab'}
            onClick={() => setSelected(i)}
          >
            <strong>{c.name}</strong>
            <small>{summarizeBuild(c)}</small>
          </button>
        ))}
      </div>

      <div className="builder-grid">
        <section className="cardish">
          <h3>基本</h3>
          <label>
            名前
            <input value={char.name} onChange={(e) => updateChar({ name: e.target.value })} />
          </label>
          <label>
            種族
            <select
              value={char.raceId}
              onChange={(e) => updateChar({ raceId: e.target.value as CharacterBuild['raceId'] })}
            >
              {RACE_LIST.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <p className="hint">{RACE_LIST.find((r) => r.id === char.raceId)?.description}</p>
          <IconPicker value={char.icon} onChange={(icon) => updateChar({ icon })} />
          <p className="statline">
            メインLv {mainLevel(char)} ／ HP {computeMaxHp(char)} ／ 移動 {computeMove(char)}
          </p>
        </section>

        <section className="cardish">
          <h3>技能（経験値配分）</h3>
          <p className="hint">メインレベル = 技能レベルの最大値。チーム総経験値から割り振ります。</p>
          <div className="skill-list">
            {SKILL_LINE_LIST.map((line) => {
              const lv = skillLevel(char, line.id)
              return (
                <div key={line.id} className="skill-row">
                  <div>
                    <strong>{line.name}</strong>
                    <small>{line.description}</small>
                  </div>
                  <div className="stepper">
                    <button type="button" onClick={() => setSkillXp(line.id, lv - 1)}>
                      −
                    </button>
                    <span>Lv {lv}</span>
                    <button type="button" onClick={() => setSkillXp(line.id, lv + 1)}>
                      ＋
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="cardish">
          <h3>スキル取得</h3>
          <p className="hint">解禁済みスキルから最大 {reg.maxAbilitiesPerChar} 個まで取得。</p>
          <div className="ability-list">
            {SKILL_LINE_LIST.flatMap((line) =>
              line.abilityIds.map((id) => {
                const ab = ABILITIES[id]
                const open = unlocked.includes(id)
                const taken = char.abilityIds.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!open && !taken}
                    className={taken ? 'ability taken' : open ? 'ability' : 'ability locked'}
                    onClick={() => toggleAbility(id)}
                  >
                    <strong>
                      {ab.name}
                      <em>
                        {SKILL_LINES[ab.skillLine].name} Lv{ab.requiredLevel}
                      </em>
                    </strong>
                    <span>{ab.description}</span>
                  </button>
                )
              }),
            )}
          </div>
        </section>

        <section className="cardish">
          <h3>
            ステータス（残り {remStats} / 付与 {availableStatPoints(char, team.regulationId)}）
          </h3>
          <div className="stat-grid">
            {STAT_IDS.map((id) => (
              <div key={id} className="stat-row">
                <span>{STAT_LABELS[id]}</span>
                <strong>{stats[id]}</strong>
                <div className="stepper">
                  <button type="button" onClick={() => setBonus(id, -1)}>
                    −
                  </button>
                  <span>+{char.bonusStats[id] ?? 0}</span>
                  <button type="button" onClick={() => setBonus(id, 1)}>
                    ＋
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="cardish wide">
          <h3>装備・アイテム（チーム資産）</h3>
          <div className="item-grid">
            {ITEM_LIST.map((item) => {
              const taken = char.itemIds.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  className={taken ? 'item taken' : 'item'}
                  onClick={() => toggleItem(item.id)}
                >
                  <strong>
                    {item.name} <em>{item.price}G</em>
                  </strong>
                  <span>
                    [{item.slot}] {item.description}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      {issues.length > 0 && (
        <div className="issues">
          <h4>レギュレーションチェック</h4>
          <ul>
            {issues.map((iss) => (
              <li key={iss.path + iss.message}>{iss.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
