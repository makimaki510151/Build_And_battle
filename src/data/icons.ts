import type { IconColor, IconShape } from '../types/game'

export const ICON_SHAPES: { id: IconShape; label: string }[] = [
  { id: 'circle', label: '円' },
  { id: 'diamond', label: '菱' },
  { id: 'hex', label: '六角' },
  { id: 'shield', label: '盾' },
  { id: 'star', label: '星' },
]

export const ICON_COLORS: { id: IconColor; label: string; hex: string }[] = [
  { id: 'crimson', label: '紅', hex: '#c23b3b' },
  { id: 'azure', label: '蒼', hex: '#2f6fad' },
  { id: 'emerald', label: '翠', hex: '#2f8f62' },
  { id: 'amber', label: '琥珀', hex: '#c48a2a' },
  { id: 'violet', label: '藤', hex: '#6d4ea3' },
  { id: 'slate', label: '鉛', hex: '#5a6672' },
  { id: 'ivory', label: '象牙', hex: '#d9d2c0' },
  { id: 'coral', label: '珊瑚', hex: '#d56a54' },
]

export function colorHex(color: IconColor): string {
  return ICON_COLORS.find((c) => c.id === color)?.hex ?? '#888'
}
