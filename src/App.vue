<script setup lang="ts">
import { polygonContains } from 'd3-polygon'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PCDLoader } from 'three/addons/loaders/PCDLoader.js'
import { ref } from 'vue'
import { usePointer } from './composables/usePointer'
import { useSafeWindowEventListener } from './composables/useSafeEventListener'
import { useThree } from './composables/useThree'
import { IsMac } from './constants'
import { computePolygonPoints, toNDCPosition, toZPosition } from './utils'

const container = ref<HTMLElement>(null!)
const { scene, camera, renderer } = useThree({ container, showAxes: true })

const controls = new OrbitControls(camera, renderer.domElement)
controls.enabled = false

const pcd = ref('0000.pcd')

const ModelOptionMap: Record<string, any> = {
  '0000.pcd': {
    position: { x: -0.5, y: -13, z: 6.3 },
    rotation: { x: 1.12, y: 0, z: 0.06 },
  },
}

const loader = new PCDLoader()
const pcdObject = ref<THREE.Points<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.PointsMaterial, THREE.Object3DEventMap>>()
loader.load(pcd.value, (points) => {
  if (!points.geometry.attributes.color) {
    const count = points.geometry.attributes.position.array.length / 3
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count - 3; i++) {
      const index = i * 3
      colors[index] = 1.0
      colors[index + 1] = 1.0
      colors[index + 2] = 1.0
    }
    points.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    points.material.vertexColors = true
  }

  pcdObject.value = points
  scene.add(points)

  camera.position.set(
    ModelOptionMap[pcd.value].position.x,
    ModelOptionMap[pcd.value].position.y,
    ModelOptionMap[pcd.value].position.z,
  )
  controls.update()
})

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

function computePointsInLasso(lasso: [number, number][]) {
  if (!pcdObject.value) {
    return
  }
  const positions = pcdObject.value.geometry.attributes.position.array
  const length = positions.length / 3
  const colors = pcdObject.value.geometry.attributes.color.array
  const isContainsPointsIndex = new Set()

  for (let i = 0; i < length; i++) {
    const index = i * 3
    if (polygonContains(lasso, [positions[index], positions[index + 1]])) {
      isContainsPointsIndex.add(index)
      colors[index] = 0.3
      colors[index + 1] = 0.3
      colors[index + 2] = 0.8
    }
  }

  pcdObject.value.geometry.attributes.color.needsUpdate = true
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
      const polygon = computePolygonPoints(points)
      drawLasso(polygon.points)
      computePointsInLasso(polygon.array)
    }

    if (isPressed) {
      points.length = 0
    }
  },
  checkPressed: true,
})

function enableControlsChange(event: KeyboardEvent) {
  if (IsMac ? event.metaKey : event.ctrlKey) {
    isCtrlPressed.value = true
    controls.enabled = true
  }
}

function disableControlsChange(event: KeyboardEvent) {
  if (!event.metaKey && !event.ctrlKey) {
    isCtrlPressed.value = false
    controls.enabled = false
  }
}

useSafeWindowEventListener('keydown', enableControlsChange)
useSafeWindowEventListener('keyup', disableControlsChange)
</script>

<template>
  <div ref="container" w-full h-screen />
</template>
