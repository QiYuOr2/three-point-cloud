<script setup lang="ts">
import { polygonContains } from 'd3-polygon'
import * as THREE from 'three'
import { ArcballControls } from 'three/addons/controls/ArcballControls.js'
import { ref } from 'vue'
import Tools from './components/Tools.vue'
import { usePCD } from './composables/usePCD'
import { usePointer } from './composables/usePointer'
import { useSafeWindowEventListener } from './composables/useSafeEventListener'
import { useThree } from './composables/useThree'
import { computePolygonPoints, setColor, toNDCPosition, toZPosition } from './utils'

const container = ref<HTMLElement>(null!)
const { scene, camera, renderer } = useThree({ container, showAxes: true })

const controls = new ArcballControls(camera, renderer.domElement)
controls.enabled = false

const { pcdObject, loadPCDFile } = usePCD({ file: '0000.pcd', onLoad: (points, oldPoints) => {
  if (oldPoints) {
    oldPoints.geometry.dispose()
    oldPoints.material.dispose()
    scene.remove(oldPoints)
  }

  if (!points.geometry.attributes.color) {
    const count = points.geometry.attributes.position.array.length / 3
    const colors = new Float32Array(count * 4)

    for (let i = 0; i < count; i++) {
      setColor(colors, i * 4, [1, 1, 1, 1])
    }

    points.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4))
    points.material.vertexColors = true
    points.material.transparent = true
  }

  scene.add(points)

  controls.update()
} })

const isCtrlPressed = ref(false)

const geometry = new THREE.BufferGeometry()
const material = new THREE.LineBasicMaterial({ color: 0xFFFF00 })
const line = new THREE.Line(geometry, material)
scene.add(line)
const points: Array<THREE.Vector3> = []

function drawLasso(points: THREE.Vector3[]) {
  const positions = new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
}

const selectPointsIndex: number[] = []
let basicColor: THREE.BufferAttribute
function computePointsInLasso(lasso: [number, number][]) {
  if (!pcdObject.value || !lasso.length) {
    return
  }
  const positions = pcdObject.value.geometry.attributes.position.array
  basicColor = pcdObject.value.geometry.attributes.color.clone()
  const colors = pcdObject.value.geometry.attributes.color.array

  for (let posIndex = 0; posIndex < positions.length; posIndex += 3) {
    const x = positions[posIndex]
    const y = positions[posIndex + 1]
    const pointIndex = posIndex / 3
    const colorIndex = pointIndex * 4

    if (polygonContains(lasso, [x, y])) {
      selectPointsIndex.push(pointIndex)
      colors[colorIndex + 3] = 1
      continue
    }
    colors[colorIndex + 3] = 0
  }

  pcdObject.value.geometry.attributes.color.needsUpdate = true
}

function addColor() {
  if (!pcdObject.value) {
    return
  }
  pcdObject.value.geometry.setAttribute('color', basicColor)
  const colors = pcdObject.value.geometry.attributes.color.array
  selectPointsIndex.forEach((index) => {
    const colorIndex = index * 4
    setColor(colors, colorIndex, [0, 0.2, 0.5])
  })
  pcdObject.value.geometry.attributes.color.needsUpdate = true
}

function cancel() {
  pcdObject.value?.geometry.setAttribute('color', basicColor)
}

usePointer({
  element: container,
  pointerPositionTransfer: toNDCPosition,
  onTrigger: (_, point) => {
    if (isCtrlPressed.value) {
      return
    }

    const position = toZPosition(camera, point)

    points.push(new THREE.Vector3(position.x, position.y, 0))

    drawLasso(points)
  },
  onPressedChange: (isPressed) => {
    if (!isPressed) {
      drawLasso([])
      const polygon = computePolygonPoints(points)
      computePointsInLasso(polygon.array)
    }

    if (isPressed) {
      points.length = 0
    }
  },
  checkPressed: true,
})

function enableControlsChange(event: KeyboardEvent) {
  if (event.code === 'Space') {
    isCtrlPressed.value = true
    controls.enabled = true
  }
}

function disableControlsChange(event: KeyboardEvent) {
  if (event.code === 'Space') {
    isCtrlPressed.value = false
    controls.enabled = false
  }
}

useSafeWindowEventListener('keydown', enableControlsChange)
useSafeWindowEventListener('keyup', disableControlsChange)
</script>

<template>
  <div ref="container" w-full h-screen>
    <Tools @add-color="addColor" @upload="loadPCDFile" @cancel="cancel" />
  </div>
</template>
