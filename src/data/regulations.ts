import type { Regulation, RegulationId } from '../types/game'

export const REGULATIONS: Record<RegulationId, Regulation> = {
  beginner: {
    id: 'beginner',
    name: '初心者',
    description:
      'レベルを抑えて行動を絞り、シンプルな戦いにするレギュレーション。基本の移動と攻撃を覚えたい人向け。',
    teamXp: 24,
    maxSkillLevel: 3,
    maxSkillLinesPerChar: 2,
    maxAbilitiesPerChar: 6,
    teamAssets: 1200,
    statPointsPerMainLevel: 2,
    battlefieldSize: { width: 900, height: 640 },
  },
  normal: {
    id: 'normal',
    name: '通常',
    description:
      '戦術の幅とバランスを両立。技能と装備の組み合わせで構築の面白さが広がる標準レギュレーション。',
    teamXp: 48,
    maxSkillLevel: 5,
    maxSkillLinesPerChar: 3,
    maxAbilitiesPerChar: 10,
    teamAssets: 3200,
    statPointsPerMainLevel: 3,
    battlefieldSize: { width: 1000, height: 700 },
  },
  advanced: {
    id: 'advanced',
    name: '上級',
    description:
      'できることの幅を極限まで広げ、最大限自由なビルド構築が可能なレギュレーション。',
    teamXp: 80,
    maxSkillLevel: 8,
    maxSkillLinesPerChar: 4,
    maxAbilitiesPerChar: 16,
    teamAssets: 7000,
    statPointsPerMainLevel: 4,
    battlefieldSize: { width: 1100, height: 760 },
  },
}

export const REGULATION_LIST = Object.values(REGULATIONS)
