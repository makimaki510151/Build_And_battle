import { colorHex } from '../data/icons'
import type { CharacterIcon } from '../types/game'

export function drawUnitIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  icon: CharacterIcon,
  radius: number,
  outline: string,
) {
  const fill = colorHex(icon.color)
  ctx.save()
  ctx.translate(x, y)
  ctx.beginPath()
  pathShape(ctx, icon.shape, radius)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = outline
  ctx.stroke()
  ctx.restore()
}

function pathShape(
  ctx: CanvasRenderingContext2D,
  shape: CharacterIcon['shape'],
  r: number,
) {
  switch (shape) {
    case 'circle':
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      break
    case 'diamond':
      ctx.moveTo(0, -r)
      ctx.lineTo(r, 0)
      ctx.lineTo(0, r)
      ctx.lineTo(-r, 0)
      ctx.closePath()
      break
    case 'hex': {
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6
        const x = Math.cos(a) * r
        const y = Math.sin(a) * r
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      break
    }
    case 'shield':
      ctx.moveTo(0, -r)
      ctx.lineTo(r * 0.85, -r * 0.45)
      ctx.lineTo(r * 0.75, r * 0.2)
      ctx.quadraticCurveTo(0, r * 1.15, -r * 0.75, r * 0.2)
      ctx.lineTo(-r * 0.85, -r * 0.45)
      ctx.closePath()
      break
    case 'star': {
      const spikes = 5
      const outer = r
      const inner = r * 0.45
      for (let i = 0; i < spikes * 2; i++) {
        const rad = (i * Math.PI) / spikes - Math.PI / 2
        const dist = i % 2 === 0 ? outer : inner
        const x = Math.cos(rad) * dist
        const y = Math.sin(rad) * dist
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      break
    }
  }
}
