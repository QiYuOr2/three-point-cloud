<script setup lang="ts">
import type { Ref } from 'vue'
import type { PCDFileData } from '../composables/usePCD'
import { useFileDialog, useWebWorker } from '@vueuse/core'
import { onUnmounted, ref } from 'vue'
import { SHOULD_SPLIT_FILE_SIZE } from '../common/constants'
import { useSafeWindowEventListener } from '../composables/useSafeEventListener'

defineProps<{
  blockStep: [number, number]
}>()

const emits = defineEmits<{
  (event: 'upload', PCD: PCDFileData): void
  (event: 'addColor'): void
  (event: 'cancel'): void
  (event: 'reset'): void
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

function smallFileReader(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    if (!e.target?.result) {
      return
    }
    emits('upload', { data: e.target.result })
  }
  reader.readAsArrayBuffer(file)
}

const loadingStep = ref<[number, number]>([0, 0])

const { worker } = useWebWorker(() => new Worker(
  new URL('../workers/fileReader.worker.ts', import.meta.url),
  { type: 'module' },
))

function onMessage(event: MessageEvent) {
  const { positions, bounds, step } = event.data
  if (positions) {
    emits('upload', {
      positions,
      isFinish: true,
      bounds,
    })
  }
  loadingStep.value = step
}

onUnmounted(() => worker.value?.removeEventListener('message', onMessage))

async function bigFileReader(fileStream: ReadableStream<Uint8Array>) {
  if (!worker.value) {
    return
  }

  worker.value.postMessage({ fileStream }, [fileStream])

  worker.value.addEventListener('message', onMessage)
}

onChange((files) => {
  if (!files) {
    return
  }

  const file = files[0]

  if (file.size < SHOULD_SPLIT_FILE_SIZE) {
    smallFileReader(file)
    return
  }

  // loader.load / loader.parse 直接加载都会报错 非法数组长度，选择手动读取文件中各点的位置
  bigFileReader(file.stream())
})

function percent(current: number, total: number) {
  return `${Math.round(current / total * 10000) / 100}%`
}
</script>

<template>
  <div
    fixed left-4 bottom-6 flex items-center bg-slate-950 px-6 py-3 rounded-lg shadow-sm shadow-gray-5 border-1
    border-solid border-gray-400 text-gray-100 text-sm @click.stop
  >
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

    <div button @click="$emit('reset')">
      相机复位
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

    <template v-if="loadingStep[0]">
      <div class="divider-v mx-3" />
      <div>
        {{ `加载文件：${percent(...loadingStep)}` }}
      </div>
    </template>
    <template v-if="blockStep?.[1]">
      <div class="divider-v mx-3" />
      <div>
        {{ `计算分区： ${blockStep[0] === 0 ? '计算中' : percent(...blockStep) }` }}
      </div>
    </template>
  </div>
</template>
