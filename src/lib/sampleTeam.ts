import type { CharacterBuild, RegulationId, TeamBuild } from '../types/game'
import { createEmptyTeam } from './character'

function char(name: string, partial: Partial<CharacterBuild>): CharacterBuild {
  return {
    id: crypto.randomUUID(),
    name,
    raceId: 'human',
    icon: { shape: 'circle', color: 'crimson' },
    skillXp: {},
    abilityIds: [],
    bonusStats: {},
    itemIds: [],
    ...partial,
  }
}

/** Ready-to-play sample teams per regulation (within XP/asset caps). */
export function createSampleTeam(regulationId: RegulationId): TeamBuild {
  const team = createEmptyTeam(regulationId, `サンプル・${regulationId}`)
  if (regulationId === 'beginner') {
    team.name = '見習い部隊'
    team.characters = [
      char('赤き剣', {
        raceId: 'beastfolk',
        icon: { shape: 'diamond', color: 'crimson' },
        skillXp: { sword: 3 },
        abilityIds: ['slash', 'cleave', 'battle_cry'],
        bonusStats: { str: 4, vit: 2 },
        itemIds: ['iron_sword'],
      }),
      char('蒼の弓', {
        raceId: 'elf',
        icon: { shape: 'circle', color: 'azure' },
        skillXp: { bow: 3 },
        abilityIds: ['shot', 'rain', 'expose_weakness'],
        bonusStats: { dex: 4, agi: 2 },
        itemIds: ['hunter_bow'],
      }),
      char('翠の杖', {
        raceId: 'spirit',
        icon: { shape: 'star', color: 'emerald' },
        skillXp: { holy: 3 },
        abilityIds: ['mend', 'bless', 'holy_ward'],
        bonusStats: { spi: 4, mag: 2 },
        itemIds: ['oak_staff'],
      }),
      char('鉛の盾', {
        raceId: 'dwarf',
        icon: { shape: 'shield', color: 'slate' },
        skillXp: { guard: 3 },
        abilityIds: ['bash', 'cover', 'iron_oath'],
        bonusStats: { vit: 4, str: 2 },
        itemIds: ['wood_shield'],
      }),
    ]
  } else if (regulationId === 'normal') {
    team.name = '常備軍サンプル'
    team.characters = [
      char('突破の刃', {
        raceId: 'beastfolk',
        icon: { shape: 'diamond', color: 'coral' },
        skillXp: { sword: 4, shadow: 2 },
        abilityIds: ['slash', 'cleave', 'breakthrough', 'palm_strike'],
        bonusStats: { str: 6, agi: 4, vit: 2 },
        itemIds: ['steel_blade'],
      }),
      char('遠矢', {
        raceId: 'elf',
        icon: { shape: 'hex', color: 'azure' },
        skillXp: { bow: 5 },
        abilityIds: ['shot', 'rain', 'snipe', 'stone_throw'],
        bonusStats: { dex: 8, agi: 4, vit: 3 },
        itemIds: ['hunter_bow', 'boots'],
      }),
      char('聖詠', {
        raceId: 'spirit',
        icon: { shape: 'star', color: 'ivory' },
        skillXp: { holy: 4, magic: 2 },
        abilityIds: ['mend', 'bless', 'smite', 'cantrip'],
        bonusStats: { spi: 7, mag: 5 },
        itemIds: ['oak_staff', 'potion'],
      }),
      char('鉄壁', {
        raceId: 'dwarf',
        icon: { shape: 'shield', color: 'amber' },
        skillXp: { guard: 4, spear: 2 },
        abilityIds: ['bash', 'cover', 'taunt_slam', 'pole_sweep_kick'],
        bonusStats: { vit: 8, str: 4 },
        itemIds: ['iron_shield', 'leather'],
      }),
    ]
  } else {
    team.name = '実験編成サンプル'
    team.characters = [
      char('剣聖', {
        raceId: 'human',
        icon: { shape: 'diamond', color: 'crimson' },
        skillXp: { sword: 6, command: 2 },
        abilityIds: ['slash', 'cleave', 'breakthrough', 'blade_dance', 'order'],
        bonusStats: { str: 10, vit: 6, dex: 4, agi: 4 },
        itemIds: ['steel_blade', 'plate'],
      }),
      char('嵐術', {
        raceId: 'elf',
        icon: { shape: 'star', color: 'violet' },
        skillXp: { magic: 7, bow: 1 },
        abilityIds: ['spark', 'fireball', 'ray', 'tempest', 'cantrip'],
        bonusStats: { mag: 12, spi: 6, dex: 4 },
        itemIds: ['arcane_rod', 'robe', 'mega_potion'],
      }),
      char('影歩', {
        raceId: 'beastfolk',
        icon: { shape: 'hex', color: 'slate' },
        skillXp: { shadow: 6, bow: 2 },
        abilityIds: ['stab', 'dash_cut', 'fan_knives', 'assassination', 'stone_throw'],
        bonusStats: { agi: 12, dex: 6, str: 4 },
        itemIds: ['dagger', 'boots', 'potion'],
      }),
      char('指揮塔', {
        raceId: 'spirit',
        icon: { shape: 'shield', color: 'amber' },
        skillXp: { command: 5, holy: 3, guard: 1 },
        abilityIds: ['order', 'coordinated', 'banner', 'mend', 'bless', 'body_block'],
        bonusStats: { spi: 8, vit: 6, mag: 3, str: 3 },
        itemIds: ['amulet', 'chainmail', 'oak_staff'],
      }),
    ]
  }
  return team
}
