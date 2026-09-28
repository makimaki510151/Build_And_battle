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
        abilityIds: ['slash', 'cleave'],
        bonusStats: { str: 4, vit: 2 },
        itemIds: ['iron_sword'],
      }),
      char('蒼の弓', {
        raceId: 'elf',
        icon: { shape: 'circle', color: 'azure' },
        skillXp: { bow: 3 },
        abilityIds: ['shot', 'rain'],
        bonusStats: { dex: 4, agi: 2 },
        itemIds: ['hunter_bow'],
      }),
      char('翠の杖', {
        raceId: 'spirit',
        icon: { shape: 'star', color: 'emerald' },
        skillXp: { holy: 3 },
        abilityIds: ['mend', 'bless'],
        bonusStats: { spi: 4, mag: 2 },
        itemIds: ['potion'],
      }),
      char('鉛の盾', {
        raceId: 'dwarf',
        icon: { shape: 'shield', color: 'slate' },
        skillXp: { guard: 3 },
        abilityIds: ['bash', 'cover'],
        bonusStats: { vit: 4, str: 2 },
        itemIds: ['leather'],
      }),
    ]
  } else if (regulationId === 'normal') {
    team.name = '常備軍サンプル'
    team.characters = [
      char('突破の刃', {
        raceId: 'beastfolk',
        icon: { shape: 'diamond', color: 'coral' },
        skillXp: { sword: 4, shadow: 2 },
        abilityIds: ['slash', 'cleave', 'breakthrough', 'stab'],
        bonusStats: { str: 6, agi: 4, vit: 2 },
        itemIds: ['steel_blade', 'boots'],
      }),
      char('遠矢', {
        raceId: 'elf',
        icon: { shape: 'hex', color: 'azure' },
        skillXp: { bow: 5 },
        abilityIds: ['shot', 'rain', 'snipe'],
        bonusStats: { dex: 8, agi: 4, vit: 3 },
        itemIds: ['sniper_bow'],
      }),
      char('聖詠', {
        raceId: 'spirit',
        icon: { shape: 'star', color: 'ivory' },
        skillXp: { holy: 4, magic: 2 },
        abilityIds: ['mend', 'bless', 'smite', 'spark'],
        bonusStats: { spi: 7, mag: 5 },
        itemIds: ['robe', 'potion'],
      }),
      char('鉄壁', {
        raceId: 'dwarf',
        icon: { shape: 'shield', color: 'amber' },
        skillXp: { guard: 4, spear: 2 },
        abilityIds: ['bash', 'cover', 'taunt_slam', 'thrust'],
        bonusStats: { vit: 8, str: 4 },
        itemIds: ['chainmail'],
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
        abilityIds: ['spark', 'fireball', 'ray', 'tempest', 'shot'],
        bonusStats: { mag: 12, spi: 6, dex: 4 },
        itemIds: ['arcane_rod', 'robe', 'mega_potion'],
      }),
      char('影歩', {
        raceId: 'beastfolk',
        icon: { shape: 'hex', color: 'slate' },
        skillXp: { shadow: 6, bow: 2 },
        abilityIds: ['stab', 'dash_cut', 'fan_knives', 'assassination', 'shot'],
        bonusStats: { agi: 12, dex: 6, str: 4 },
        itemIds: ['dagger', 'boots', 'potion'],
      }),
      char('指揮塔', {
        raceId: 'spirit',
        icon: { shape: 'shield', color: 'amber' },
        skillXp: { command: 5, holy: 3, guard: 1 },
        abilityIds: ['order', 'coordinated', 'banner', 'mend', 'bless', 'bash'],
        bonusStats: { spi: 10, vit: 6, mag: 4, str: 4 },
        itemIds: ['amulet', 'chainmail'],
      }),
    ]
  }
  return team
}
