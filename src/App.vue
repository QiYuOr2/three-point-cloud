<script setup lang="ts">
import * as THREE from 'three'
import { ArcballControls } from 'three/addons/controls/ArcballControls.js'
import { ref } from 'vue'
import { checkPolygonRelation, computePolygonPoints, PolygonRelation, vector3boundsToRectVertices } from './common/polygon'
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

const { blocks, loadPCDFile } = usePCD({ onLoad: (block) => {
  if (blocks.value.length === 1) {
    // 移除上一个
    removeSceneChildren('Points')
  }

  scene.add(block.points)

  // createHintBox(block.bounds.min, block.bounds.max).add(box)

  controls.update()
  controls.saveState()
} })

const { loassoPoints, drawLasso, computePointsInLasso, cancel, addColor, clearSelectedPoints } = useLoasso({ scene, blocks })
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
    if (isPressed) {
      clearSelectedPoints()
      return
    }

    if (!isPressed) {
      const polygon = computePolygonPoints(loassoPoints.value)

      const indexes: number[] = []

      blocks.value.forEach((block, i) => {
        const rect = vector3boundsToRectVertices(block.bounds)
        if (checkPolygonRelation(rect, loassoPoints.value) === PolygonRelation.IntersectingOrContains) {
          indexes.push(i)
        }
      })

      computePointsInLasso(polygon.tuple, indexes)
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

function resetCamera() {
  controls.reset()
}
</script>

<template>
  <div ref="container" w-full h-screen />
  <Tools @add-color="addColor" @upload="loadPCDFile" @cancel="cancel" @reset="resetCamera" />
</template>
