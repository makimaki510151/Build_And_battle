import type { RaceDef, RaceId, StatId, Stats } from '../types/game'

export const STAT_LABELS: Record<StatId, string> = {
  str: '筋力',
  dex: '器用',
  agi: '敏捷',
  vit: '耐久',
  mag: '魔力',
  spi: '精神',
}

export const STAT_IDS = Object.keys(STAT_LABELS) as StatId[]

export const RACES: Record<RaceId, RaceDef> = {
  human: {
    id: 'human',
    name: '人間',
    description: 'バランス型。どのビルドにも馴染む万能種族。',
    baseStats: { str: 8, dex: 8, agi: 8, vit: 8, mag: 8, spi: 8 },
  },
  elf: {
    id: 'elf',
    name: 'エルフ',
    description: '魔力と器用さに優れ、遠距離・魔術向き。',
    baseStats: { str: 5, dex: 10, agi: 9, vit: 6, mag: 11, spi: 9 },
  },
  dwarf: {
    id: 'dwarf',
    name: 'ドワーフ',
    description: '頑丈で力強い前線向き。守備と近接が得意。',
    baseStats: { str: 11, dex: 7, agi: 5, vit: 12, mag: 5, spi: 8 },
  },
  beastfolk: {
    id: 'beastfolk',
    name: '獣人',
    description: '筋力と敏捷が高く、機動力のあるアタッカー。',
    baseStats: { str: 11, dex: 8, agi: 11, vit: 9, mag: 4, spi: 5 },
  },
  spirit: {
    id: 'spirit',
    name: '精霊',
    description: '精神と魔力に特化。支援・回復・魔術の核。',
    baseStats: { str: 4, dex: 7, agi: 8, vit: 6, mag: 12, spi: 13 },
  },
}

export const RACE_LIST = Object.values(RACES)

export function emptyStats(): Stats {
  return { str: 0, dex: 0, agi: 0, vit: 0, mag: 0, spi: 0 }
}

export function sumStats(a: Stats, b: Partial<Stats>): Stats {
  return {
    str: a.str + (b.str ?? 0),
    dex: a.dex + (b.dex ?? 0),
    agi: a.agi + (b.agi ?? 0),
    vit: a.vit + (b.vit ?? 0),
    mag: a.mag + (b.mag ?? 0),
    spi: a.spi + (b.spi ?? 0),
  }
}

export function totalStatPoints(s: Partial<Stats>): number {
  return STAT_IDS.reduce((n, id) => n + (s[id] ?? 0), 0)
}
