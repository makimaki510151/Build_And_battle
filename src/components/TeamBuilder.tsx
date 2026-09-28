import { useMemo, useState } from 'react'
import { ITEM_LIST } from '../data/items'
import { SLOT_LABELS, WEAPON_TYPE_LABELS, formatItemEffects } from '../data/itemLabels'
import { RACE_LIST, STAT_IDS, STAT_LABELS } from '../data/races'
import { REGULATIONS } from '../data/regulations'
import { ABILITIES, SKILL_LINE_LIST, SKILL_LINES } from '../data/skills'
import {
  availableStatPoints,
  computeMaxHp,
  computeMove,
  computeStats,
  mainLevel,
  meetsWeaponRequirement,
  remainingStatPoints,
  skillLevel,
  summarizeBuild,
  teamUsedAssets,
  teamUsedXp,
  unlockedAbilities,
  validateTeam,
} from '../lib/character'
import { actionTypeLabel, baseDamageAt100 } from '../lib/damage'
import type { CharacterBuild, SkillLineId, TeamBuild } from '../types/game'
import { IconPicker } from './IconPicker'

interface Props {
  team: TeamBuild
  onChange: (team: TeamBuild) => void
  onBack: () => void
  onSave: () => void
}

type EditTab = 'basic' | 'skills' | 'abilities' | 'stats' | 'items'
type AbilityFilter = 'available' | 'taken' | 'all'
type ItemSlotFilter = 'all' | 'weapon' | 'armor' | 'accessory' | 'consumable'

const EDIT_TABS: { id: EditTab; label: string }[] = [
  { id: 'basic', label: '基本' },
  { id: 'skills', label: '技能' },
  { id: 'abilities', label: 'スキル' },
  { id: 'stats', label: 'ステ' },
  { id: 'items', label: '装備' },
]

const ITEM_SLOT_FILTERS: { id: ItemSlotFilter; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'weapon', label: '武器' },
  { id: 'armor', label: '防具' },
  { id: 'accessory', label: '装飾' },
  { id: 'consumable', label: '消耗' },
]

export function TeamBuilder({ team, onChange, onBack, onSave }: Props) {
  const [selected, setSelected] = useState(0)
  const [editTab, setEditTab] = useState<EditTab>('basic')
  const [abilityFilter, setAbilityFilter] = useState<AbilityFilter>('available')
  const [abilityLine, setAbilityLine] = useState<SkillLineId | 'all'>('all')
  const [itemSlot, setItemSlot] = useState<ItemSlotFilter>('all')
  const [hideIdleSkills, setHideIdleSkills] = useState(false)

  const reg = REGULATIONS[team.regulationId]
  const char = team.characters[selected]
  const issues = useMemo(() => validateTeam(team), [team])
  const stats = computeStats(char)
  const unlocked = unlockedAbilities(char)
  const unlockedSet = useMemo(() => new Set(unlocked), [unlocked])
  const remStats = remainingStatPoints(char, team.regulationId)

  const abilityEntries = useMemo(() => {
    return SKILL_LINE_LIST.flatMap((line) =>
      line.abilityIds.map((id) => {
        const ab = ABILITIES[id]
        const open = unlockedSet.has(id)
        const taken = char.abilityIds.includes(id)
        return { id, ab, open, taken, lineId: line.id }
      }),
    ).filter((row) => {
      if (abilityLine !== 'all' && row.lineId !== abilityLine) return false
      if (abilityFilter === 'available') return row.open || row.taken
      if (abilityFilter === 'taken') return row.taken
      return true
    })
  }, [abilityFilter, abilityLine, char.abilityIds, unlockedSet])

  const visibleSkillLines = useMemo(() => {
    if (!hideIdleSkills) return SKILL_LINE_LIST
    return SKILL_LINE_LIST.filter((line) => skillLevel(char, line.id) > 0)
  }, [char, hideIdleSkills])

  const visibleItems = useMemo(() => {
    if (itemSlot === 'all') return ITEM_LIST
    return ITEM_LIST.filter((item) => item.slot === itemSlot)
  }, [itemSlot])

  const updateChar = (patch: Partial<CharacterBuild>) => {
    const characters = team.characters.map((c, i) => (i === selected ? { ...c, ...patch } : c))
    onChange({ ...team, characters })
  }

  const setSkillXp = (line: SkillLineId, value: number) => {
    const skillXp = { ...char.skillXp }
    const v = Math.max(0, Math.min(reg.maxSkillLevel, value))
    if (v === 0) delete skillXp[line]
    else skillXp[line] = v
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
    if (char.itemIds.includes(itemId)) {
      updateChar({ itemIds: char.itemIds.filter((id) => id !== itemId) })
      return
    }
    updateChar({ itemIds: [...char.itemIds, itemId] })
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
          技能Lv上限 {reg.maxSkillLevel} ／ 技能数 {reg.maxSkillLinesPerChar} ／ スキル{' '}
          {char.abilityIds.length}/{reg.maxAbilitiesPerChar}
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

      <div className="edit-tabs" role="tablist">
        {EDIT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={editTab === tab.id}
            className={editTab === tab.id ? 'chip active' : 'chip'}
            onClick={() => setEditTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {editTab === 'basic' && (
        <section className="cardish builder-pane">
          <h3>基本</h3>
          <div className="basic-grid">
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
          </div>
          <p className="hint">{RACE_LIST.find((r) => r.id === char.raceId)?.description}</p>
          <IconPicker value={char.icon} onChange={(icon) => updateChar({ icon })} />
          <p className="statline">
            メインLv {mainLevel(char)} ／ HP {computeMaxHp(char)} ／ 移動 {computeMove(char)}
          </p>
        </section>
      )}

      {editTab === 'skills' && (
        <section className="cardish builder-pane">
          <div className="pane-head">
            <h3>技能（経験値配分）</h3>
            <label className="toggle">
              <input
                type="checkbox"
                checked={hideIdleSkills}
                onChange={(e) => setHideIdleSkills(e.target.checked)}
              />
              振った技能だけ表示
            </label>
          </div>
          <p className="hint">メインLv = 技能Lvの最大。残XP {reg.teamXp - teamUsedXp(team)}</p>
          <div className="skill-list compact">
            {(hideIdleSkills && visibleSkillLines.length === 0
              ? SKILL_LINE_LIST
              : visibleSkillLines
            ).map((line) => {
              const lv = skillLevel(char, line.id)
              return (
                <div key={line.id} className="skill-row" title={line.description}>
                  <strong>{line.name}</strong>
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
      )}

      {editTab === 'abilities' && (
        <section className="cardish builder-pane">
          <div className="pane-head">
            <h3>スキル取得</h3>
            <span className="hint tight">
              {char.abilityIds.length}/{reg.maxAbilitiesPerChar}
            </span>
          </div>

          <div className="filter-bar">
            <div className="chip-row">
              {(
                [
                  { id: 'available', label: '取得可能' },
                  { id: 'taken', label: '取得済み' },
                  { id: 'all', label: 'すべて' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={abilityFilter === f.id ? 'chip active' : 'chip'}
                  onClick={() => setAbilityFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="chip-row wrap">
              <button
                type="button"
                className={abilityLine === 'all' ? 'chip active' : 'chip'}
                onClick={() => setAbilityLine('all')}
              >
                全系統
              </button>
              {SKILL_LINE_LIST.filter(
                (line) => abilityFilter === 'all' || skillLevel(char, line.id) > 0,
              ).map((line) => (
                <button
                  key={line.id}
                  type="button"
                  className={abilityLine === line.id ? 'chip active' : 'chip'}
                  onClick={() => setAbilityLine(line.id)}
                >
                  {line.name}
                </button>
              ))}
            </div>
          </div>

          {abilityEntries.length === 0 ? (
            <p className="empty">該当スキルがありません。技能Lvを上げるか、表示条件を変えてください。</p>
          ) : (
            <div className="ability-list compact">
              {abilityEntries.map(({ id, ab, open, taken }) => {
                const dmg100 = baseDamageAt100(char, ab)
                const weaponOk = meetsWeaponRequirement(char, ab)
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!open && !taken}
                    className={taken ? 'ability taken' : open ? 'ability' : 'ability locked'}
                    onClick={() => toggleAbility(id)}
                    title={ab.description}
                  >
                    <span className="ability-top">
                      <strong>{ab.name}</strong>
                      <span className="tags">
                        <em className={ab.actionType}>{actionTypeLabel(ab.actionType)}</em>
                        <em>
                          {SKILL_LINES[ab.skillLine].name}
                          {ab.requiredLevel}
                        </em>
                        {ab.requiredWeapon ? (
                          <em className={weaponOk ? 'weapon-ok' : 'weapon-missing'}>
                            {WEAPON_TYPE_LABELS[ab.requiredWeapon]}
                            {weaponOk ? '' : '不足'}
                          </em>
                        ) : (
                          <em className="weapon-free">武器不要</em>
                        )}
                      </span>
                    </span>
                    <span className="ability-meta">
                      威力{ab.power} · 100%時{dmg100}
                      {ab.heal ? '回復' : ''} · 出目1〜100%
                      {ab.actionType === 'sub' ? ' · 副(回復)' : ''}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      {editTab === 'stats' && (
        <section className="cardish builder-pane">
          <h3>
            ステータス（残り {remStats} / {availableStatPoints(char, team.regulationId)}）
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
      )}

      {editTab === 'items' && (
        <section className="cardish builder-pane">
          <div className="pane-head">
            <h3>装備・アイテム</h3>
            <span className="hint tight">
              資産 {teamUsedAssets(team)}/{reg.teamAssets}
            </span>
          </div>
          <div className="chip-row wrap">
            {ITEM_SLOT_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={itemSlot === f.id ? 'chip active' : 'chip'}
                onClick={() => setItemSlot(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="item-grid compact">
            {visibleItems.map((item) => {
              const taken = char.itemIds.includes(item.id)
              const effects = formatItemEffects(item)
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
                  <span className="item-slot">{SLOT_LABELS[item.slot]}</span>
                  <span className="item-effects">{effects.join(' · ')}</span>
                  <span className="item-desc">{item.description}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

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
