export function toNDCPosition(event: MouseEvent | PointerEvent) {
  return {
    x: (event.clientX / window.innerWidth) * 2 - 1,
    y: -(event.clientY / window.innerHeight) * 2 + 1,
  }
}
