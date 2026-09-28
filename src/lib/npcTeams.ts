import type { CharacterBuild, RegulationId, TeamBuild } from '../types/game'
import { createEmptyTeam } from './character'

function char(name: string, partial: Partial<CharacterBuild>): CharacterBuild {
  return {
    id: crypto.randomUUID(),
    name,
    raceId: 'human',
    icon: { shape: 'circle', color: 'slate' },
    skillXp: {},
    abilityIds: [],
    bonusStats: {},
    itemIds: [],
    ...partial,
  }
}

export type NpcEncounter = {
  regulationId: RegulationId
  /** 表示名（対戦相手名） */
  commanderName: string
  /** 短い説明 */
  blurb: string
  team: TeamBuild
}

/** レギュレーションごとのテストプレイ用 NPC 部隊（経験値・資産は各レギュ内）。 */
export function createNpcEncounter(regulationId: RegulationId): NpcEncounter {
  if (regulationId === 'beginner') {
    const team = createEmptyTeam(regulationId, '訓練兵小隊')
    team.characters = [
      char('見習い剣', {
        raceId: 'human',
        icon: { shape: 'diamond', color: 'coral' },
        skillXp: { sword: 2 },
        abilityIds: ['slash'],
        bonusStats: { str: 2, vit: 2 },
        itemIds: ['iron_sword'],
      }),
      char('見習い弓', {
        raceId: 'elf',
        icon: { shape: 'circle', color: 'azure' },
        skillXp: { bow: 2 },
        abilityIds: ['shot'],
        bonusStats: { dex: 3, agi: 1 },
        itemIds: [],
      }),
      char('見習い癒', {
        raceId: 'spirit',
        icon: { shape: 'star', color: 'ivory' },
        skillXp: { holy: 2 },
        abilityIds: ['mend'],
        bonusStats: { spi: 3, mag: 1 },
        itemIds: ['potion'],
      }),
      char('見習い盾', {
        raceId: 'dwarf',
        icon: { shape: 'shield', color: 'slate' },
        skillXp: { guard: 2 },
        abilityIds: ['bash', 'cover'],
        bonusStats: { vit: 3, str: 1 },
        itemIds: ['leather'],
      }),
    ]
    // XP 8 / 24, assets ~700
    return {
      regulationId,
      commanderName: '訓練教官',
      blurb: '基本の移動と攻撃を確認する初心者向けNPC。弱いが動きは一通りこなす。',
      team,
    }
  }

  if (regulationId === 'normal') {
    const team = createEmptyTeam(regulationId, '辺境守備隊')
    team.characters = [
      char('槍兵長', {
        raceId: 'beastfolk',
        icon: { shape: 'hex', color: 'amber' },
        skillXp: { spear: 4, guard: 1 },
        abilityIds: ['thrust', 'sweep', 'pierce_line', 'bash'],
        bonusStats: { str: 5, vit: 4, dex: 3 },
        itemIds: ['long_spear', 'leather'],
      }),
      char('狙撃手', {
        raceId: 'elf',
        icon: { shape: 'circle', color: 'azure' },
        skillXp: { bow: 4 },
        abilityIds: ['shot', 'rain', 'snipe'],
        bonusStats: { dex: 7, agi: 3, vit: 2 },
        itemIds: ['hunter_bow'],
      }),
      char('従軍僧', {
        raceId: 'spirit',
        icon: { shape: 'star', color: 'emerald' },
        skillXp: { holy: 3, magic: 2 },
        abilityIds: ['mend', 'bless', 'smite', 'spark'],
        bonusStats: { spi: 6, mag: 3 },
        itemIds: ['oak_staff', 'potion'],
      }),
      char('盾役', {
        raceId: 'dwarf',
        icon: { shape: 'shield', color: 'slate' },
        skillXp: { guard: 4, sword: 1 },
        abilityIds: ['bash', 'cover', 'taunt_slam', 'slash'],
        bonusStats: { vit: 7, str: 4, spi: 1 },
        itemIds: ['chainmail'],
      }),
    ]
    // XP ~19 / 48
    return {
      regulationId,
      commanderName: '辺境隊長',
      blurb: '前衛・射撃・回復の基本編成。通常レギュのバランス確認用。',
      team,
    }
  }

  const team = createEmptyTeam(regulationId, '黒騎実験隊')
  team.characters = [
    char('黒刃', {
      raceId: 'beastfolk',
      icon: { shape: 'diamond', color: 'crimson' },
      skillXp: { sword: 5, shadow: 3 },
      abilityIds: ['slash', 'cleave', 'breakthrough', 'stab', 'dash_cut'],
      bonusStats: { str: 9, agi: 7, vit: 4 },
      itemIds: ['steel_blade', 'boots'],
    }),
    char('災火', {
      raceId: 'elf',
      icon: { shape: 'star', color: 'violet' },
      skillXp: { magic: 6, bow: 2 },
      abilityIds: ['spark', 'fireball', 'ray', 'tempest', 'shot'],
      bonusStats: { mag: 12, spi: 4, dex: 4 },
      itemIds: ['arcane_rod', 'robe'],
    }),
    char('夜鴉', {
      raceId: 'human',
      icon: { shape: 'hex', color: 'slate' },
      skillXp: { shadow: 5, bow: 3 },
      abilityIds: ['stab', 'dash_cut', 'fan_knives', 'assassination', 'shot'],
      bonusStats: { agi: 10, dex: 8, str: 2 },
      itemIds: ['dagger', 'leather', 'potion'],
    }),
    char('軍師', {
      raceId: 'spirit',
      icon: { shape: 'shield', color: 'amber' },
      skillXp: { command: 4, holy: 3, guard: 1 },
      abilityIds: ['order', 'coordinated', 'banner', 'mend', 'bless', 'bash'],
      bonusStats: { spi: 8, vit: 4, mag: 2, str: 2 },
      itemIds: ['amulet', 'chainmail', 'mega_potion'],
    }),
  ]
  return {
    regulationId,
    commanderName: '実験隊司令',
    blurb: '上級レギュ相当の複合ビルド。編成の弱点を突けるか試すNPC。',
    team,
  }
}

export const NPC_ENCOUNTERS: Record<RegulationId, () => NpcEncounter> = {
  beginner: () => createNpcEncounter('beginner'),
  normal: () => createNpcEncounter('normal'),
  advanced: () => createNpcEncounter('advanced'),
}
