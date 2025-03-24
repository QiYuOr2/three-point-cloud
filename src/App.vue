<script setup lang="ts">
import type { PCDFileData } from './composables/usePCD'
import { ArcballControls } from 'three/addons/controls/ArcballControls.js'
import { ref } from 'vue'
import { to3DPosition, toNDCPosition } from './common/utils'
import Tools from './components/Tools.vue'
import { useLasso } from './composables/useLasso'
import { usePCD } from './composables/usePCD'
import { usePointer } from './composables/usePointer'
import { useSafeWindowEventListener } from './composables/useSafeEventListener'
import { useThree } from './composables/useThree'

const container = ref<HTMLElement>(null!)
const { scene, camera, renderer, removeSceneChildren } = useThree({ container, showAxes: true })


const controls = new ArcballControls(camera, renderer.domElement)
controls.enabled = false

const blockStep = ref<[number, number]>([0, 0])
const { blocks, loadPCDFile } = usePCD({
  onLoad: (block, step) => {
    if (block) {
      if (blocks.value.length === 1) {
      // 移除上一个
        removeSceneChildren('Points')
      }

      scene.add(block.points)
      // scene.add(createHintBox(block.bounds.min, block.bounds.max))

      controls.update()
      controls.saveState()
    }

    if (step) {
      blockStep.value = step
    }
  },
})

const {
  willColoringBlockIndexes,
  setupLasso,
  updateLasso,
  computePointsInLasso,
  cancel,
  addColor,
} = useLasso({ camera, blocks, renderer, scene })

setupLasso(scene)

const isCtrlPressed = ref(false)

usePointer({
  element: container,
  onTrigger: (_, point) => {
    if (isCtrlPressed.value) {
      return
    }
    const pointNDC = toNDCPosition(point)
    const point3D = to3DPosition(pointNDC, camera)

    updateLasso({ point: point3D, pointNDC })
  },
  onPressedChange: (isPressed) => {
    if (isCtrlPressed.value) {
      return
    }

    if (isPressed) {
      cancel()
      return
    }

    if (!isPressed) {
      computePointsInLasso(blocks.value)

      // 清空套索提示线
      updateLasso({ clear: true })
    }
  },
  checkPressed: true,
})

useSafeWindowEventListener('keydown', (event: KeyboardEvent) => {
  if (event.code === 'Space') {
    isCtrlPressed.value = true
    controls.enabled = true
  }
})
useSafeWindowEventListener('keyup', (event: KeyboardEvent) => {
  if (event.code === 'Space') {
    isCtrlPressed.value = false
    controls.enabled = false
  }
})

function upload(file: PCDFileData) {
  blocks.value = []
  willColoringBlockIndexes.value = []
  loadPCDFile(file)
}

function resetCamera() {
  controls.reset()
}
</script>

<template>
  <div ref="container" w-full h-screen />
  <Tools :block-step="blockStep" @add-color="addColor" @upload="upload" @cancel="cancel" @reset="resetCamera" />
</template>
