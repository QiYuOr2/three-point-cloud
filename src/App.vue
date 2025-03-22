<script setup lang="ts">
import type { PointsWithType } from './composables/usePCD'
import * as THREE from 'three'
import { ArcballControls } from 'three/addons/controls/ArcballControls.js'
import { ref } from 'vue'
import { computePolygonPoints, setColor, toNDCPosition, toZPosition } from './common/utils'
import Tools from './components/Tools.vue'
import { useLoasso } from './composables/useLasso'
import { PCDType, usePCD } from './composables/usePCD'
import { usePointer } from './composables/usePointer'
import { useSafeWindowEventListener } from './composables/useSafeEventListener'
import { useThree } from './composables/useThree'

const container = ref<HTMLElement>(null!)
const { scene, camera, renderer } = useThree({ container, showAxes: true })

const controls = new ArcballControls(camera, renderer.domElement)
controls.enabled = false

const { pcdObject, loadPCDFile } = usePCD({ onLoad: (pcd, oldPcd) => {
  function addVertexColor(pcd: Pick<PointsWithType, 'points'>) {
    // 手动加入颜色信息
    if (!pcd.points.geometry.attributes.color) {
      const count = pcd.points.geometry.attributes.position.array.length / 3
      const colors = new Float32Array(count * 4)

      for (let i = 0; i < count; i++) {
        setColor(colors, i * 4, [1, 1, 1, 1])
      }

      pcd.points.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4))
      pcd.points.material.vertexColors = true
      pcd.points.material.transparent = true
    }
  }

  if (oldPcd.type === PCDType.Full || pcd.type === PCDType.Full) {
    let i = 0
    while (scene.children.length > i) {
      if (scene.children[i].type !== 'Points') {
        i++
        continue
      }
      scene.remove(scene.children[i])
    }
  }

  addVertexColor(pcd)

  scene.add(pcd.points)

  if (pcd.bounds) {
    // ### bounds ###
    const { min, max } = pcd.bounds
    const geometry = new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2])
    const edges = new THREE.EdgesGeometry(geometry)
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x00FF00 }),
    )
    line.position.set(
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    )
    scene.add(line)
  }

  controls.update()
} })

const { loassoPoints, drawLasso, computePointsInLasso, cancel, addColor } = useLoasso({ scene, pcdObject })
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
    if (!isPressed) {
      const polygon = computePolygonPoints(loassoPoints.value)
      computePointsInLasso(polygon.array)
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
</script>

<template>
  <div ref="container" w-full h-screen>
    <Tools @add-color="addColor" @upload="loadPCDFile" @cancel="cancel" />
  </div>
</template>
