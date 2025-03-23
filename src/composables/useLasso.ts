import type { Ref } from 'vue'
import type { Block } from './usePCD'
import { polygonContains } from 'd3-polygon'
import * as THREE from 'three'
import { ref } from 'vue'
import { COLOR } from '../common/constants'

interface UseLoassoOptions {
  scene: THREE.Scene
  blocks: Ref<Block[]>
}

export function useLoasso({ scene, blocks }: UseLoassoOptions) {
  const willColoringBlockIndexes = ref<number[]>([])

  const geometry = new THREE.BufferGeometry()
  const material = new THREE.LineBasicMaterial({ color: 0xFF0000 })
  const line = new THREE.Line(geometry, material)
  scene.add(line)

  const loassoPoints = ref<Array<THREE.Vector3>>([])

  function drawLasso(clear = false) {
    if (clear) {
      loassoPoints.value = []
    }

    const positions = new Float32Array(loassoPoints.value.flatMap(p => [p.x, p.y, p.z]))
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  }

  /**
   * 计算哪些点在套索内
   */
  function computePointsInLasso(lasso: [number, number][], needComputeblockIndexes: number[]) {
    const start = window.performance.now()
    if (!needComputeblockIndexes.length || !lasso.length) {
      return
    }

    willColoringBlockIndexes.value.push(...needComputeblockIndexes)

    blocks.value.forEach(block => block.saveState())

    needComputeblockIndexes.forEach((index) => {
      const block = blocks.value[index]
      const positions = block.points.geometry.attributes.position.array

      const colors = block.points.geometry.attributes.color.array

      for (let posIndex = 0; posIndex < positions.length; posIndex += 3) {
        const x = positions[posIndex]
        const y = positions[posIndex + 1]
        const pointIndex = posIndex / 3
        const colorIndex = pointIndex * 4

        if (polygonContains(lasso, [x, y])) {
          block.addWillColoringPoint(pointIndex)
          colors[colorIndex + 3] = 1
          continue
        }
        colors[colorIndex + 3] = 0
      }

      block.points.geometry.attributes.color.needsUpdate = true
    })

    console.warn(`[computePointsInLasso] ${window.performance.now() - start} ms`)
  }

  function addColor() {
    if (!willColoringBlockIndexes.value.length) {
      return
    }
    blocks.value.forEach(block => block.setVisible(true))
    willColoringBlockIndexes.value.forEach((index) => {
      const block = blocks.value[index]
      block.setColor(COLOR)
    })
  }

  function clearSelectedPoints() {
    willColoringBlockIndexes.value.forEach((index) => {
      blocks.value[index].clearWillColoringPoint()
    })
    willColoringBlockIndexes.value = []
  }

  function cancel() {
    blocks.value.forEach((block) => {
      block.setVisible(true)
      block.reset('color')
    })
  }

  return {
    loassoPoints,
    willColoringBlockIndexes,
    computePointsInLasso,
    drawLasso,
    addColor,
    cancel,
    clearSelectedPoints,
  }
}
