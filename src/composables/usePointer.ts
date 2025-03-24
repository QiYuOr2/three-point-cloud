import type { MaybeRef } from 'vue'
import { ref, watch } from 'vue'
import { useElementEventListener } from './useSafeEventListener'

interface Point {
  x: number
  y: number
}

interface UsePointerOptions {
  element: MaybeRef<HTMLElement>
  /**
   * 当指针移动时触发的回调函数
   * @param event - PointerEvent 事件对象
   * @param point - 当前指针位置坐标
   */
  onTrigger: (event: PointerEvent, point: Point, isPressed: boolean) => void
  /**
   * 当指针按下状态改变时触发的回调函数
   * @param isPointerPressed - 当前指针是否处于按下状态
   */
  onPressedChange?: (isPointerPressed: boolean) => void
  /**
   * 是否检查指针按下状态
   * 如果为 `true`，则只在指针按下时触发移动事件
   */
  checkPressed?: boolean
}

export function usePointer({ element, onTrigger, onPressedChange, checkPressed }: UsePointerOptions) {
  const isPressed = ref(false)
  const x = ref(0)
  const y = ref(0)

  const onPointerDown = () => {
    isPressed.value = true
  }
  const onPointerUp = () => {
    isPressed.value = false
  }
  const onPointerMove = (event: PointerEvent) => {
    if (checkPressed && !isPressed.value) {
      return
    }

    x.value = event.clientX
    y.value = event.clientY

    onTrigger(event, { x: x.value, y: y.value }, isPressed.value)
  }

  watch(isPressed, value => onPressedChange?.(value))

  useElementEventListener(element, 'pointerdown', onPointerDown)
  useElementEventListener(element, 'pointermove', onPointerMove)
  useElementEventListener(element, 'pointerup', onPointerUp)

  return { x, y, isPressed }
}
