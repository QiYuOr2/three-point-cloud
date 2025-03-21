<script setup lang="ts">
import type { Ref } from 'vue'
import { useFileDialog } from '@vueuse/core'
import { ref } from 'vue'
import { useSafeWindowEventListener } from '../composables/useSafeEventListener'

const emits = defineEmits<{
  (event: 'upload', file: ArrayBuffer | string): void
  (event: 'addColor'): void
  (event: 'cancel'): void
}>()

document.oncontextmenu = () => false

const isSpacePressed = ref(false)
useSafeWindowEventListener('keypress', (event) => {
  if (event.code === 'Space') {
    isSpacePressed.value = true
  }
})
useSafeWindowEventListener('keyup', (event) => {
  if (event.code === 'Space') {
    isSpacePressed.value = false
  }
})

const isMouseLeftPressed = ref(false)
const isMouseRightPressed = ref(false)
const mousePressedMap: Record<number, Ref<boolean>> = {
  0: isMouseLeftPressed,
  2: isMouseRightPressed,
}

useSafeWindowEventListener('mousedown', (event) => {
  mousePressedMap[event.button].value = true
})
useSafeWindowEventListener('mouseup', (event) => {
  mousePressedMap[event.button].value = false
})

const { open, onChange } = useFileDialog({
  accept: '.pcd',
  multiple: false,
})

onChange((files) => {
  if (!files) {
    return
  }

  const file = files[0]
  const reader = new FileReader()
  reader.onload = (e) => {
    if (!e.target?.result) {
      return
    }
    emits('upload', e.target.result)
  }
  reader.readAsArrayBuffer(file)
})
</script>

<template>
  <div fixed left-4 bottom-6 flex items-center bg-slate-950 px-6 py-3 rounded-lg shadow-sm shadow-gray-5 border-1 border-solid border-gray-400 text-gray-100 text-sm @click.stop>
    <div flex items-center>
      <span>按住</span>
      <kbd class="key" :class="[{ 'text-cyan-500 border-cyan-500': isSpacePressed }]">空格</kbd>
      <span>拖动</span>
      <kbd class="key" :class="[{ 'text-cyan-500 border-cyan-500': isMouseLeftPressed }]">鼠标左键</kbd>
      <span>/</span>
      <kbd class="key" :class="[{ 'text-cyan-500 border-cyan-500': isMouseRightPressed }]">鼠标右键</kbd>
      <span>转动视角</span>
    </div>

    <div class="divider-v mx-3" />

    <div button @click="open()">
      <span>点击上传</span>
      <span font-mono mx-1 text-xs>.pcd</span>
      <span>文件</span>
    </div>

    <div button ml-3 @click="$emit('addColor')">
      上色
    </div>

    <div button ml-3 @click="$emit('cancel')">
      取消
    </div>
  </div>
</template>
