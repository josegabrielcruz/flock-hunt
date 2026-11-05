import { GAME_W, GAME_H } from './constants'
import type { Vec2 } from './types'

type ClickHandler = (pos: Vec2) => void
type MoveHandler  = (pos: Vec2 | null) => void

/** Manages mouse and touch input, converting screen coords to logical game coords. */
export class InputHandler {
  private canvas: HTMLCanvasElement
  private clickHandlers: ClickHandler[] = []
  private moveHandlers:  MoveHandler[]  = []
  private didTouch: boolean = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    canvas.addEventListener('click',      this.onMouseClick)
    canvas.addEventListener('mousemove',  this.onMouseMove)
    canvas.addEventListener('mouseleave', this.onMouseLeave)
    canvas.addEventListener('touchstart', this.onTouch,     { passive: false })
    canvas.addEventListener('touchmove',  this.onTouchMove, { passive: false })
  }

  onShot(handler: ClickHandler): void {
    this.clickHandlers.push(handler)
  }

  onMove(handler: MoveHandler): void {
    this.moveHandlers.push(handler)
  }

  destroy(): void {
    this.canvas.removeEventListener('click',      this.onMouseClick)
    this.canvas.removeEventListener('mousemove',  this.onMouseMove)
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave)
    this.canvas.removeEventListener('touchstart', this.onTouch)
    this.canvas.removeEventListener('touchmove',  this.onTouchMove)
  }

  private toLogical(clientX: number, clientY: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect()
    // Convert screen coords to logical game coords accounting for CSS letterbox scale
    return {
      x: (clientX - rect.left) * (GAME_W / rect.width),
      y: (clientY - rect.top)  * (GAME_H / rect.height),
    }
  }

  private onMouseMove = (e: MouseEvent) => {
    const pos = this.toLogical(e.clientX, e.clientY)
    for (const handler of this.moveHandlers) handler(pos)
  }

  private onMouseLeave = () => {
    for (const handler of this.moveHandlers) handler(null)
  }

  private onMouseClick = (e: MouseEvent) => {
    if (this.didTouch) {
      this.didTouch = false
      return
    }
    const pos = this.toLogical(e.clientX, e.clientY)
    for (const handler of this.clickHandlers) handler(pos)
  }

  private onTouch = (e: TouchEvent) => {
    e.preventDefault()
    this.didTouch = true
    const touch = e.touches[0]
    if (!touch) return
    const pos = this.toLogical(touch.clientX, touch.clientY)
    for (const handler of this.moveHandlers) handler(pos)
    for (const handler of this.clickHandlers) handler(pos)
  }

  private onTouchMove = (e: TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    if (!touch) return
    const pos = this.toLogical(touch.clientX, touch.clientY)
    for (const handler of this.moveHandlers) handler(pos)
  }
}
