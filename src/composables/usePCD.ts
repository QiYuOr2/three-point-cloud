import type * as THREE from 'three'
import type { MaybeRef } from 'vue'
import type { Bounds } from '../common/polygon'
import type { PCDPoints, RGBArray } from '../common/utils'
import { useWebWorker } from '@vueuse/core'
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js'
import { ref, toRaw, unref, watch } from 'vue'
import { COLOR } from '../common/constants'
import { addVertexColor, createPoints, getVector3sBounds, positionsToVector3, setColor } from '../common/utils'

interface PCDFromStream {
  positions: Float32Array
  bounds: Bounds
  isFinish?: boolean
}
interface PCDFromLoader {
  data: ArrayBuffer | string
}

function isPCDFromStream(value: unknown): value is PCDFromStream {
  return !!(value as PCDFromStream).positions
}

export type PCDFileData = PCDFromStream | PCDFromLoader

export class Block {
  points: PCDPoints
  color?: THREE.BufferAttribute
  bounds: Bounds
  willColoringPointIndexes: number[] = []
  shouldBlockColoring = false

  constructor(points: PCDPoints) {
    this.points = points

    const vector3s = positionsToVector3(points.geometry.attributes.position.array)

    this.bounds = getVector3sBounds(vector3s)

    addVertexColor(this.points)
  }

  saveState() {
    if (this.color) {
      return
    }
    this.color = this.points.geometry.attributes.color.clone()
  }

  reset(key: keyof Pick<Block, 'color'>) {
    const value = this[key]
    if (value) {
      this.points.geometry.setAttribute(key, value.clone())
      this.points.geometry.attributes[key].needsUpdate = true
      this[key] = undefined
    }
  }

  addWillColoringPoint(index: number) {
    this.willColoringPointIndexes.push(index)
  }

  clearWillColoringPoint() {
    this.willColoringPointIndexes = []
  }

  setVisible(value: boolean) {
    this.points.material.opacity = value ? 1 : 0
  }

  setColor([r, g, b]: RGBArray) {
    if (this.shouldBlockColoring) {
      this.points.material.color.setRGB(r, g, b)
      return
    }

    this.reset('color')
    const colors = this.points.geometry.attributes.color.array
    this.willColoringPointIndexes.forEach((pointIndex) => {
      const colorIndex = pointIndex * 4
      setColor(colors, colorIndex, COLOR)
    })
    this.points.geometry.attributes.color.needsUpdate = true
    this.shouldBlockColoring = false
  }
}

interface UsePCDOptions {
  filePath?: MaybeRef<string>
  onLoad: (block?: Block, step?: [number, number]) => void
}

export function usePCD({ filePath, onLoad }: UsePCDOptions) {
  const loader = new PCDLoader()
  const blocks = ref<Block[]>([])

  const _onLoad = (value?: Block, step?: [number, number]) => onLoad(toRaw(value), step)

  if (filePath) {
    watch(() => unref(filePath), async (value) => {
      const points = await loader.loadAsync(value)
      blocks.value = [new Block(points)]
      _onLoad(blocks.value[0])
    }, { immediate: true })
  }

  const { worker } = useWebWorker(() => new Worker(
    new URL('../workers/splitToBlocks.worker.ts', import.meta.url),
    { type: 'module' },
  ))

  const onMessage = (event: MessageEvent<{ blockValues?: number[], step?: [number, number] }>) => {
    const { blockValues, step } = event.data

    if (step) {
      _onLoad(undefined, step)
    }

    if (blockValues) {
      const points = createPoints(new Float32Array(blockValues))
      const block = new Block(points)

      _onLoad(block)
      blocks.value.push(block)
    }
  }

  const fromStream = (options: PCDFromStream) => {
    const { min, max } = options.bounds

    const positions = options.positions

    worker.value?.postMessage({ positions, min, max })

    blocks.value = []
    worker.value?.addEventListener('message', onMessage)
  }

  const fromLoader = (options: PCDFromLoader) => {
    const loader = new PCDLoader()
    const points = loader.parse(options.data)

    const block = new Block(points)
    _onLoad(block)
    blocks.value = [block]
  }

  const loadPCDFile = (pcd: PCDFileData) => {
    if (isPCDFromStream(pcd)) {
      fromStream(pcd)
      return
    }

    fromLoader(pcd)
  }

  return { blocks, loadPCDFile }
}
