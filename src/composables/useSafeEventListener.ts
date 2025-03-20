import type { Ref } from 'vue'
import { onMounted, onUnmounted, unref } from 'vue'

export function useElementEventListener<T extends keyof HTMLElementEventMap>(
  target: Ref<HTMLElement | null> | HTMLElement,
  eventName: T,
  callback: (event: HTMLElementEventMap[T]) => void,
  options?: AddEventListenerOptions,
) {
  const fn = (event: HTMLElementEventMap[T]) => {
    try {
      callback(event)
    }
    catch (error) {
      throw new Error(`[useElementEventListener]: ${eventName} ${error}`)
    }
  }

  onMounted(() => {
    const el = unref(target)
    el?.addEventListener(eventName, fn, options)
  })

  onUnmounted(() => {
    const el = unref(target)
    el?.removeEventListener(eventName, fn, options)
  })
}

export function useSafeWindowEventListener<T extends keyof WindowEventMap>(
  eventName: T,
  callback: (event: WindowEventMap[T]) => void,
  options?: AddEventListenerOptions,
) {
  const fn = (event: WindowEventMap[T]) => {
    try {
      callback(event)
    }
    catch (error) {
      throw new Error(`[useSafeWindowEventListener]: ${eventName} ${error}`)
    }
  }

  onMounted(() => {
    window.addEventListener(eventName, fn, options)
  })

  onUnmounted(() => {
    window.removeEventListener(eventName, fn, options)
  })
}
