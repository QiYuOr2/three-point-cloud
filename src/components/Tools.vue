<script setup lang="ts">
import type { Ref } from 'vue'
import type { PCDHeader } from '../common/file'
import type { PCDFileData } from '../composables/usePCD'
import { useFileDialog } from '@vueuse/core'
import { ref } from 'vue'
import { SHOULD_SPLIT_FILE_SIZE, SPLITED_FILE_SIZE } from '../common/constants'
import { binaryDataHandler, mergeTypeArray, readHeader } from '../common/file'
import { positionsToVector3Like } from '../common/utils'
import { useSafeWindowEventListener } from '../composables/useSafeEventListener'

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

async function bigFileReader(fileStream: ReadableStream<Uint8Array>) {
  const reader = fileStream.getReader()

  let data = new Uint8Array()

  let header = ''
  let headerObject = {} as PCDHeader
  let totalPositions = new Float32Array()

  // 计算边界值
  let [minX, minY, minZ] = [Infinity, Infinity, Infinity]
  let [maxX, maxY, maxZ] = [-Infinity, -Infinity, -Infinity]

  while (true) {
    const { value, done } = await reader.read()

    if (done) {
      break
    }

    if (!header) {
      const { headerText, headerObject: _headerObj, headerLength } = readHeader(value)
      header = headerText
      headerObject = _headerObj

      const otherData = value.slice(headerLength)
      data = new Uint8Array(otherData.length)
      data.set(otherData)
      continue
    }

    data = mergeTypeArray(data, value, Uint8Array)

    if (data.byteLength >= SPLITED_FILE_SIZE || value.byteLength < SPLITED_FILE_SIZE) {
      const { otherData, positions } = binaryDataHandler(data, headerObject)
      // emits('upload', { type: PCDType.Part, positions })

      positionsToVector3Like(positions, ({ x, y, z }) => {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        minZ = Math.min(minZ, z)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
        maxZ = Math.max(maxZ, z)
      })

      totalPositions = mergeTypeArray(totalPositions, positions, Float32Array)
      data = otherData
    }
  }

  emits('upload', {
    positions: totalPositions,
    isFinish: true,
    bounds: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    },
  })
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
  </div>
</template>
