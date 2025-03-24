import type { Ref } from 'vue'
import type { Block } from './usePCD'
import * as THREE from 'three'
import { ref, toRaw, watchEffect } from 'vue'
import { COLOR } from '../common/constants'
import { checkPolygonRelation, isContainsPolygon, polygonContains, PolygonRelation } from '../common/polygon'
import { positionsToVector3Like, toScreenPosition } from '../common/utils'
import { useWebWorker } from '@vueuse/core'

interface UseLassoOptions {
  camera: THREE.Camera
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  blocks: Ref<Block[]>
}

export function useLasso({ blocks, camera }: UseLassoOptions) {
  const willColoringBlockIndexes = ref<number[]>([])

  const lassoPoints = ref<Array<THREE.Vector3>>([])
  const screenLassoPoints = ref<Array<THREE.Vector2Like>>([])

  let geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>
  let lassoLine: THREE.Line<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.LineBasicMaterial, THREE.Object3DEventMap>

  function setupLasso(scene: THREE.Scene) {
    geometry = new THREE.BufferGeometry()
    const material = new THREE.LineBasicMaterial({ color: 0xFF0000 })
    lassoLine = new THREE.Line(geometry, material)
    scene.add(lassoLine)
  }

  function updateLasso(options: { point?: THREE.Vector3, pointNDC?: THREE.Vector2Like, clear?: boolean }) {
    if (options.clear) {
      lassoPoints.value = []
      lassoLine.visible = false
      screenLassoPoints.value = []
    }

    options.pointNDC && screenLassoPoints.value.push(options.pointNDC)
    options.point && lassoPoints.value.push(options.point)

    if (lassoPoints.value.length < 2) {
      return
    }

    const geometry = new THREE.BufferGeometry().setFromPoints([
      ...lassoPoints.value,
      lassoPoints.value[0],
    ])
    lassoLine.visible = true
    lassoLine.geometry.dispose()
    lassoLine.geometry = geometry
  }

  const { data, post } = useWebWorker<{ blockIndex: number; visibleIndexes: number[]; hiddenIndexes: number[] }>(() => new Worker(
    new URL('../workers/lassoSelection.worker.ts', import.meta.url),
    { type: 'module' },
  ))

  watchEffect(() => {
    const { blockIndex, visibleIndexes, hiddenIndexes } = data.value ?? {}
    if (blockIndex === undefined) {
      return
    }

    const block = blocks.value[blockIndex]
    const colors = block.points.geometry.attributes.color.array
    visibleIndexes.forEach((index) => {
      colors[index * 4 + 3] = 1
      block.willColoringPointIndexes.push(index)
    })

    hiddenIndexes.forEach((index) => {
      colors[index * 4 + 3] = 0
    })

    block.points.geometry.attributes.color.needsUpdate = true
  })

  /**
   * 计算哪些点在套索内
   */
  function computePointsInLasso(blocks: Block[]) {
    if (lassoPoints.value.length < 3 || !blocks.length) {
      return
    }

    const start = window.performance.now()

    const blockIndexes: number[] = []

    blocks.forEach((block, i) => {
      block.saveState()
      const rect = block.toNDC(camera)
      if (checkPolygonRelation(rect, screenLassoPoints.value) === PolygonRelation.IntersectingOrContains) {
        willColoringBlockIndexes.value.push(i)
        // 两个多边形有相交
        if (isContainsPolygon(screenLassoPoints.value, rect)) {
          // 套索完全包含了该区域
          block.shouldBlockColoring = true
          return
        }
        // 部分相交需要进一步检查点
        blockIndexes.push(i)
        return
      }
      block.setVisible(false)
    })

    blockIndexes.forEach((index) => {
      const block = blocks[index]

      if (block.shouldBlockColoring) {
        return
      }

      const positions = block.points.geometry.attributes.position.array
      const colors = block.points.geometry.attributes.color.array
      
      post({
        blockIndex: index,
        positions,
        colors,
        screenLassoPoints: toRaw(screenLassoPoints.value),
        camera: {
          projectionMatrix: Array.from(camera.projectionMatrix.elements),
          matrixWorldInverse: Array.from(camera.matrixWorldInverse.elements)
        }
      })
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
      const block = blocks.value[index]
      block.clearWillColoringPoint()
      block.setVisible(true)
    })
    willColoringBlockIndexes.value = []
  }

  function cancel() {
    clearSelectedPoints()
    blocks.value.forEach((block) => {
      block.setVisible(true)
      block.reset('color')
    })
  }

  return {
    willColoringBlockIndexes,
    computePointsInLasso,
    setupLasso,
    updateLasso,
    addColor,
    cancel,
    clearSelectedPoints,
  }
}
