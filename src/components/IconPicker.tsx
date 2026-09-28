import { colorHex, ICON_COLORS, ICON_SHAPES } from '../data/icons'
import type { CharacterIcon } from '../types/game'

interface Props {
  value: CharacterIcon
  onChange: (icon: CharacterIcon) => void
}

export function IconPicker({ value, onChange }: Props) {
  return (
    <div className="icon-picker">
      <div className="icon-preview" style={{ background: colorHex(value.color) }} data-shape={value.shape}>
        <IconSvg shape={value.shape} />
      </div>
      <div className="icon-options">
        <div className="chip-row">
          {ICON_SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={value.shape === s.id ? 'chip active' : 'chip'}
              onClick={() => onChange({ ...value, shape: s.id })}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="chip-row">
          {ICON_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={value.color === c.id ? 'swatch active' : 'swatch'}
              style={{ background: c.hex }}
              title={c.label}
              onClick={() => onChange({ ...value, color: c.id })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function IconSvg({ shape }: { shape: CharacterIcon['shape'] }) {
  const common = { width: 28, height: 28, viewBox: '0 0 28 28', fill: 'rgba(255,255,255,0.9)' }
  switch (shape) {
    case 'circle':
      return (
        <svg {...common}>
          <circle cx="14" cy="14" r="10" />
        </svg>
      )
    case 'diamond':
      return (
        <svg {...common}>
          <polygon points="14,3 25,14 14,25 3,14" />
        </svg>
      )
    case 'hex':
      return (
        <svg {...common}>
          <polygon points="14,3 24,9 24,19 14,25 4,19 4,9" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...common}>
          <path d="M14 3 L24 8 L22 16 C22 21 14 25 14 25 C14 25 6 21 6 16 L4 8 Z" />
        </svg>
      )
    case 'star':
      return (
        <svg {...common}>
          <polygon points="14,3 17,11 25,11 18.5,16 21,24 14,19 7,24 9.5,16 3,11 11,11" />
        </svg>
      )
  }
}
