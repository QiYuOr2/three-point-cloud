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
   * 自定义指针位置转换函数
   * @param event - PointerEvent 事件对象
   * @returns 转换后的坐标点
   */
  pointerPositionTransfer?: (event: PointerEvent) => Point
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

export function usePointer({ element, onTrigger, pointerPositionTransfer, onPressedChange, checkPressed }: UsePointerOptions) {
  const isPressed = ref(false)
  const x = ref(0)
  const y = ref(0)

  const transfer = pointerPositionTransfer ?? ((event: PointerEvent) => ({ x: event.clientX, y: event.clientY }))

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

    const point = transfer(event)
    x.value = point.x
    y.value = point.y

    onTrigger(event, point, isPressed.value)
  }

  watch(isPressed, value => onPressedChange?.(value))

  useElementEventListener(element, 'pointerdown', onPointerDown)
  useElementEventListener(element, 'pointermove', onPointerMove)
  useElementEventListener(element, 'pointerup', onPointerUp)

  return { x, y, isPressed }
}
