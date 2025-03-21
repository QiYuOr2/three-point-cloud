<script setup lang="ts">
import { useToggle } from '@vueuse/core'
import { polygonContains } from 'd3-polygon'
import * as THREE from 'three'
import { ArcballControls } from 'three/addons/controls/ArcballControls.js'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'
import { ref } from 'vue'
import { POINT_SIZE } from './common/constants'
import { computePolygonPoints, setColor, toNDCPosition, toZPosition } from './common/utils'
import Tools from './components/Tools.vue'
import { usePCD } from './composables/usePCD'
import { usePointer } from './composables/usePointer'
import { useSafeWindowEventListener } from './composables/useSafeEventListener'
import { useThree } from './composables/useThree'

const container = ref<HTMLElement>(null!)
const { scene, camera, renderer } = useThree({ container, showAxes: true })

const controls = new ArcballControls(camera, renderer.domElement)
controls.enabled = false

const { pcdObject, loadPCDFile } = usePCD({ onLoad: (pcd, oldPcd) => {
  if (!pcd) {
    // 如果没有返回新的 pcd，说明是分步加载完成的通知
    // 合并所有的 点云图
    const geometries: THREE.BufferGeometry[] = []
    scene.children.forEach((child) => {
      if (child instanceof THREE.Points) {
        geometries.push(child.geometry)
      }
    })
    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, false)
    const material = new THREE.PointsMaterial({ size: POINT_SIZE })
    const mergedPoints = new THREE.Points(mergedGeometry, material)
    scene.add(mergedPoints)

    scene.children.forEach((child) => {
      if (child instanceof THREE.Points) {
        scene.remove(child)
      }
    })

    return
  }

  if (oldPcd && oldPcd.type !== pcd.type) {
    oldPcd.points.geometry.dispose()
    oldPcd.points.material.dispose()
    scene.remove(oldPcd.points)
  }

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

  scene.add(pcd.points)

  controls.update()
} })

const isCtrlPressed = ref(false)

const geometry = new THREE.BufferGeometry()
const material = new THREE.LineBasicMaterial({ color: 0xFFFF00 })
const line = new THREE.Line(geometry, material)
scene.add(line)
const points: Array<THREE.Vector3> = []

const [isDrawing, toggleIsDrawing] = useToggle(false)
function drawLasso(points: THREE.Vector3[] = []) {
  const positions = new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
}

const selectPointsIndex: number[] = []
let basicColor: THREE.BufferAttribute
function computePointsInLasso(lasso: [number, number][]) {
  if (!pcdObject.value || !lasso.length) {
    return
  }
  const positions = pcdObject.value.points.geometry.attributes.position.array

  if (!isDrawing.value) {
    basicColor = pcdObject.value.points.geometry.attributes.color.clone()
  }
  toggleIsDrawing(true)
  const colors = pcdObject.value.points.geometry.attributes.color.array

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

  pcdObject.value.points.geometry.attributes.color.needsUpdate = true
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
      drawLasso()
      const polygon = computePolygonPoints(points)
      computePointsInLasso(polygon.array)
    }

    if (isPressed) {
      points.length = 0
    }
  },
  checkPressed: true,
})

function addColor() {
  if (!pcdObject.value) {
    return
  }
  toggleIsDrawing(false)
  pcdObject.value.points.geometry.setAttribute('color', basicColor)
  const colors = pcdObject.value.points.geometry.attributes.color.array
  selectPointsIndex.forEach((index) => {
    const colorIndex = index * 4
    setColor(colors, colorIndex, [0, 0.2, 0.5])
  })
  pcdObject.value.points.geometry.attributes.color.needsUpdate = true
}

function cancel() {
  toggleIsDrawing(false)
  pcdObject.value?.points.geometry.setAttribute('color', basicColor)
}

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
