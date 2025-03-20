<script setup lang="ts">
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { PCDLoader } from 'three/addons/loaders/PCDLoader.js'
import { ref } from 'vue'
import { usePointer } from './composables/usePointer'
import { useSafeWindowEventListener } from './composables/useSafeEventListener'
import { useThree } from './composables/useThree'
import { IsMac } from './constants'
import { toNDCPosition } from './utils'

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

const laoder = new PCDLoader()

laoder.load(pcd.value, (points) => {
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

const lassoDrawing = ref(0)

function drawLine() {
  const positions = new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
}

usePointer({
  element: container,
  pointerPositionTransfer: toNDCPosition,
  onTrigger: (_, point) => {
    if (isCtrlPressed.value) {
      return
    }

    // NDC坐标 -> 3D 空间坐标  camera 视线方向上的一点
    const vector = new THREE.Vector3(point.x, point.y, 0).unproject(camera)
    // camera 指向 改点 的单位向量
    const direction = vector.sub(camera.position).normalize()
    const distance = -camera.position.z / direction.z
    const position = camera.position.clone().add(direction.multiplyScalar(distance))

    points.push(new THREE.Vector3(position.x, position.y, 0))

    lassoDrawing.value = requestAnimationFrame(() => drawLine())
  },
  onPressedChange: (isPressed) => {
    if (!isPressed && lassoDrawing.value) {
      points.push(points[0])
      drawLine()
      cancelAnimationFrame(lassoDrawing.value)
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
