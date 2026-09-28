export type RegulationId = 'beginner' | 'normal' | 'advanced'

export type RaceId = 'human' | 'elf' | 'dwarf' | 'beastfolk' | 'spirit'

export type StatId = 'str' | 'dex' | 'agi' | 'vit' | 'mag' | 'spi'

export type SkillLineId =
  | 'sword'
  | 'spear'
  | 'bow'
  | 'magic'
  | 'holy'
  | 'shadow'
  | 'guard'
  | 'command'

export type IconShape = 'circle' | 'diamond' | 'hex' | 'shield' | 'star'

export type IconColor =
  | 'crimson'
  | 'azure'
  | 'emerald'
  | 'amber'
  | 'violet'
  | 'slate'
  | 'ivory'
  | 'coral'

export interface Stats {
  str: number
  dex: number
  agi: number
  vit: number
  mag: number
  spi: number
}

export interface Regulation {
  id: RegulationId
  name: string
  description: string
  teamXp: number
  maxSkillLevel: number
  maxSkillLinesPerChar: number
  maxAbilitiesPerChar: number
  teamAssets: number
  statPointsPerMainLevel: number
  battlefieldSize: { width: number; height: number }
}

export interface RaceDef {
  id: RaceId
  name: string
  description: string
  baseStats: Stats
}

export type WeaponType = 'sword' | 'spear' | 'bow' | 'staff' | 'dagger' | 'shield' | 'axe' | 'mace'

export type ItemSlot = 'weapon' | 'armor' | 'accessory' | 'consumable'

export interface AbilityDef {
  id: string
  name: string
  description: string
  skillLine: SkillLineId
  requiredLevel: number
  /** 主行動はターンに1回、副行動は何度でも */
  actionType: 'main' | 'sub'
  costAp: number
  range: number
  aoe: number
  shape: 'single' | 'circle' | 'line' | 'cone'
  coneAngle?: number
  /** 100%時の基礎威力（表示・算出の核） */
  power: number
  powerStat: StatId
  /**
   * 連鎖閾値（互換用・現行ダメージは出目1〜100%）。
   * @deprecated
   */
  cascadeThreshold: number
  /** 指定時、該当 weaponType の武器を1つ以上所持している必要あり */
  requiredWeapon?: WeaponType
  heal?: boolean
  moveBonus?: number
}

export interface SkillLineDef {
  id: SkillLineId
  name: string
  description: string
  abilityIds: string[]
}

export interface ItemDef {
  id: string
  name: string
  description: string
  price: number
  slot: ItemSlot
  bonuses: Partial<Stats>
  /** 武器の種別（武器スロット向け）。スキルの武器指定と対応 */
  weaponType?: WeaponType
  hpBonus?: number
  moveBonus?: number
  charges?: number
  healAmount?: number
}

export interface CharacterIcon {
  shape: IconShape
  color: IconColor
}

export interface CharacterBuild {
  id: string
  name: string
  raceId: RaceId
  icon: CharacterIcon
  skillXp: Partial<Record<SkillLineId, number>>
  abilityIds: string[]
  bonusStats: Partial<Stats>
  itemIds: string[]
}

export interface TeamBuild {
  id: string
  name: string
  regulationId: RegulationId
  characters: CharacterBuild[]
  updatedAt: number
}

export interface BattleUnit {
  uid: string
  ownerId: string
  character: CharacterBuild
  x: number
  y: number
  hp: number
  maxHp: number
  move: number
  /** 主行動を使い切ったか */
  mainUsed: boolean
  moved: boolean
  /** このターン既に使った副行動スキルID（同一副行動は1回まで） */
  usedSubIds: string[]
  itemCharges: Record<string, number>
}

export type BattlePhase =
  | 'initiative'
  | 'playing'
  | 'animating'
  | 'ended'

export interface BattleState {
  phase: BattlePhase
  turnOwnerId: string
  turnNumber: number
  units: BattleUnit[]
  winnerId: string | null
  log: string[]
  seed: number
}

export type NetMessage =
  | { type: 'hello'; playerId: string; playerName: string; team: TeamBuild }
  | { type: 'ready'; playerId: string }
  | { type: 'initiative_choice'; playerId: string; preferFirst: boolean }
  | { type: 'battle_sync'; state: BattleState }
  | { type: 'action'; playerId: string; action: BattleAction }
  | { type: 'chat'; playerId: string; text: string }
  | { type: 'resign'; playerId: string }

export type BattleAction =
  | { kind: 'move'; unitUid: string; x: number; y: number }
  | { kind: 'ability'; unitUid: string; abilityId: string; tx: number; ty: number }
  | { kind: 'item'; unitUid: string; itemId: string; tx: number; ty: number }
  | { kind: 'wait'; unitUid: string }
  | { kind: 'end_turn' }

export interface MatchSession {
  role: 'host' | 'guest'
  roomCode: string
  localPlayerId: string
  remotePlayerId: string | null
  localName: string
  remoteName: string | null
  regulationId: RegulationId
}
