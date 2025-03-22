import type { Ref } from 'vue'
import type { PointsWithType } from './usePCD'
import { useToggle } from '@vueuse/core'
import { polygonContains } from 'd3-polygon'
import * as THREE from 'three'
import { ref } from 'vue'
import { setColor } from '../common/utils'

interface UseLoassoOptions {
  scene: THREE.Scene
  pcdObject: Ref<PointsWithType>
}

export function useLoasso({ scene, pcdObject }: UseLoassoOptions) {
  const geometry = new THREE.BufferGeometry()
  const material = new THREE.LineBasicMaterial({ color: 0xFFFF00 })
  const line = new THREE.Line(geometry, material)
  scene.add(line)

  const loassoPoints = ref<Array<THREE.Vector3>>([])

  const [isDrawing, toggleIsDrawing] = useToggle(false)
  function drawLasso(clear = false) {
    if (clear) {
      loassoPoints.value = []
    }

    const positions = new Float32Array(loassoPoints.value.flatMap(p => [p.x, p.y, p.z]))
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  }

  let selectPointsIndex: number[] = []
  const basicColor = ref<THREE.BufferAttribute>()

  /**
   * 计算哪些点在套索内
   */
  function computePointsInLasso(lasso: [number, number][]) {
    const start = window.performance.now()
    if (!Object.keys(pcdObject.value).length || !lasso.length) {
      return
    }
    const positions = pcdObject.value.points.geometry.attributes.position.array

    if (!isDrawing.value) {
      basicColor.value = pcdObject.value.points.geometry.attributes.color.clone()
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
    console.warn(`[computePointsInLasso] ${window.performance.now() - start} ms`)
  }

  function addColor() {
    if (!pcdObject.value) {
      return
    }
    toggleIsDrawing(false)
    pcdObject.value.points.geometry.setAttribute('color', basicColor.value!)
    const colors = pcdObject.value.points.geometry.attributes.color.array
    selectPointsIndex.forEach((index) => {
      const colorIndex = index * 4
      setColor(colors, colorIndex, [0, 0.2, 0.5])
    })
    pcdObject.value.points.geometry.attributes.color.needsUpdate = true
    selectPointsIndex = []
  }

  function cancel() {
    toggleIsDrawing(false)
    selectPointsIndex = []
    pcdObject.value?.points.geometry.setAttribute('color', basicColor.value!)
  }

  return {
    computePointsInLasso,
    drawLasso,
    loassoPoints,
    basicColor,
    addColor,
    toggleIsDrawing,
    cancel,
  }
}
