import type { ItemDef, StatId, WeaponType } from '../types/game'
import { STAT_LABELS } from './races'

export const WEAPON_TYPE_LABELS: Record<WeaponType, string> = {
  sword: '剣',
  spear: '槍',
  bow: '弓',
  staff: '杖',
  dagger: '暗器',
  shield: '盾',
  axe: '斧',
  mace: '鎚',
}

export const SLOT_LABELS: Record<ItemDef['slot'], string> = {
  weapon: '武器',
  armor: '防具',
  accessory: '装飾',
  consumable: '消耗品',
}

/** アイテム効果の人間可読な一覧（ビルダー表示用） */
export function formatItemEffects(item: ItemDef): string[] {
  const lines: string[] = []
  if (item.weaponType) lines.push(`武器種: ${WEAPON_TYPE_LABELS[item.weaponType]}`)
  for (const [k, v] of Object.entries(item.bonuses) as [StatId, number | undefined][]) {
    if (v) lines.push(`${STAT_LABELS[k]} ${v > 0 ? '+' : ''}${v}`)
  }
  if (item.hpBonus) lines.push(`最大HP ${item.hpBonus > 0 ? '+' : ''}${item.hpBonus}`)
  if (item.moveBonus) lines.push(`移動 ${item.moveBonus > 0 ? '+' : ''}${item.moveBonus}`)
  if (item.healAmount) lines.push(`使用時回復 ${item.healAmount}`)
  if (item.charges) lines.push(`使用回数 ${item.charges}`)
  if (lines.length === 0) lines.push('特別な補正なし')
  return lines
}

export function formatItemEffectsShort(item: ItemDef): string {
  return formatItemEffects(item).join(' · ')
}
