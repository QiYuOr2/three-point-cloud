<script setup lang="ts">
import type { PCDFileData } from './composables/usePCD'
import * as THREE from 'three'
import { ArcballControls } from 'three/addons/controls/ArcballControls.js'
import { ref } from 'vue'
import { checkPolygonRelation, computePolygonPoints, isContainsPolygon, PolygonRelation, vector3boundsToRectVertices } from './common/polygon'
import { toNDCPosition, toZPosition } from './common/utils'
import Tools from './components/Tools.vue'
import { useLoasso } from './composables/useLasso'
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

      controls.update()
      controls.saveState()
    }

    if (step) {
      blockStep.value = step
    }
  },
})

const { loassoPoints, willColoringBlockIndexes, drawLasso, computePointsInLasso, cancel, addColor, clearSelectedPoints } = useLoasso({ scene, blocks })
const isCtrlPressed = ref(false)

usePointer({
  element: container,
  pointerPositionTransfer: toNDCPosition,
  onTrigger: (_, point) => {
    if (isCtrlPressed.value) {
      return
    }

    const position = toZPosition(camera, point)
    loassoPoints.value.push(new THREE.Vector3(position.x, position.y, 0))

    drawLasso()
  },
  onPressedChange: (isPressed) => {
    if (isCtrlPressed.value) {
      return
    }

    if (isPressed) {
      clearSelectedPoints()
      return
    }

    if (!isPressed) {
      const polygon = computePolygonPoints(loassoPoints.value)

      const pointIndexes: number[] = []

      blocks.value.forEach((block, i) => {
        const rect = vector3boundsToRectVertices(block.bounds)
        if (checkPolygonRelation(rect, loassoPoints.value) === PolygonRelation.IntersectingOrContains) {
          // 两个多边形有相交
          if (isContainsPolygon(loassoPoints.value, rect)) {
            // 套索完全包含了该区域
            blocks.value[i].shouldBlockColoring = true
            willColoringBlockIndexes.value.push(i)
            return
          }
          pointIndexes.push(i)
          return
        }
        block.setVisible(false)
      })

      computePointsInLasso(polygon.tuple, pointIndexes)

      // 清空套索提示线
      drawLasso(true)
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
