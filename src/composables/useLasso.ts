import type { Ref } from 'vue'
import type { Block } from './usePCD'
import { useWebWorker } from '@vueuse/core'
import * as THREE from 'three'
import { ref, toRaw, watchEffect } from 'vue'
import { COLOR } from '../common/constants'
import { checkPolygonRelation, isContainsPolygon, PolygonRelation } from '../common/polygon'

interface UseLassoOptions {
  camera: THREE.Camera
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  blocks: Ref<Block[]>
}

interface OnMessageReturn {
  blockIndex: number
  visibleIndexes: number[]
  hiddenIndexes: number[]
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

    if (lassoPoints.value.length < 3) {
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

  const { data: selectionData, post: selectionPost } = useWebWorker<OnMessageReturn>(() => new Worker(
    new URL('../workers/lassoSelection.worker.ts', import.meta.url),
    { type: 'module' },
  ))

  let checkPointBlockCount = 0
  let onSelectionWorkerMessageCount = 0
  let willRenderIndex: OnMessageReturn[] = []
  let willHideBlockIndexes: number[] = []
  watchEffect(() => {
    if (selectionData.value?.blockIndex === undefined || checkPointBlockCount === 0) {
      return
    }

    willRenderIndex.push(selectionData.value)

    onSelectionWorkerMessageCount += 1

    if (checkPointBlockCount === onSelectionWorkerMessageCount) {
      willHideBlockIndexes.forEach(index => blocks.value[index].setVisible(false))
      willRenderIndex.forEach(({ blockIndex, visibleIndexes, hiddenIndexes }) => {
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
    }
  })

  /**
   * 计算哪些点在套索内
   */
  function computePointsInLasso() {
    if (lassoPoints.value.length < 3 || !blocks.value.length) {
      return
    }

    checkPointBlockCount = 0
    onSelectionWorkerMessageCount = 0
    willRenderIndex = []
    willHideBlockIndexes = []
    willColoringBlockIndexes.value = []

    blocks.value.forEach((block, i) => {
      block.saveState()

      if (!block.points.userData.visible) {
        block.setVisible(false)
        return
      }

      const rect = block.toNDC(camera)
      const relation = checkPolygonRelation(rect, screenLassoPoints.value)

      if (relation === PolygonRelation.IntersectingOrContains) {
        willColoringBlockIndexes.value.push(i)
        if (isContainsPolygon(screenLassoPoints.value, rect)) {
          block.shouldBlockColoring = true
          return
        }

        selectionPost({
          blockIndex: i,
          positions: block.points.geometry.attributes.position.array,
          colors: block.points.geometry.attributes.color.array,
          screenLassoPoints: toRaw(screenLassoPoints.value),
          camera: {
            projectionMatrix: Array.from(camera.projectionMatrix.elements),
            matrixWorldInverse: Array.from(camera.matrixWorldInverse.elements),
          },
        })
        checkPointBlockCount += 1
      }
      else {
        willHideBlockIndexes.push(i)
      }
    })
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
