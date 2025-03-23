import type { MaybeRef } from 'vue'
import type { Bounds } from '../common/polygon'
import type { PCDPoints } from '../common/utils'
import * as THREE from 'three'
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js'
import { ref, toRaw, unref, watch } from 'vue'
import { PCD_SPLIT_NUM } from '../common/constants'
import { addVertexColor, createPoints, positionsToVector3, positionsToVector3Like } from '../common/utils'

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
  willColoringPointIndexes: number[] = []
  bounds: Bounds

  constructor(points: PCDPoints) {
    this.points = points

    const vector3s = positionsToVector3(points.geometry.attributes.position.array)

    const box = new THREE.Box3().setFromPoints(vector3s)
    const { min, max } = box
    this.bounds = { min, max }

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
}

interface UsePCDOptions {
  filePath?: MaybeRef<string>
  onLoad: (block: Block) => void
}

export function usePCD({ filePath, onLoad }: UsePCDOptions) {
  const loader = new PCDLoader()
  const blocks = ref<Block[]>([])

  const _onLoad = (value: Block) => onLoad(toRaw(value))

  if (filePath) {
    watch(() => unref(filePath), async (value) => {
      const points = await loader.loadAsync(value)
      blocks.value = [new Block(points)]
      _onLoad(blocks.value[0])
    }, { immediate: true })
  }

  const fromStream = (options: PCDFromStream) => {
    const blockMap = new Map<string, Array<number>>()

    const { min, max } = options.bounds
    const blockSize = [
      (max.x - min.x) / PCD_SPLIT_NUM,
      (max.y - min.y) / PCD_SPLIT_NUM,
      (max.z - min.z) / PCD_SPLIT_NUM,
    ]

    const positions = options.positions

    positionsToVector3Like(positions, ({ x, y, z }) => {
      // 利用 相对于点云最小位置的偏移量 来计算该点在哪个位置
      const blockX = Math.floor((x - min.x) / blockSize[0])
      const blockY = Math.floor((y - min.y) / blockSize[1])
      const blockZ = Math.floor((z - min.z) / blockSize[2])
      const blockKey = `${blockX}_${blockY}_${blockZ}`

      if (!blockMap.has(blockKey)) {
        blockMap.set(blockKey, [])
      }

      const block = blockMap.get(blockKey)!
      block.push(x, y, z)

      blockMap.set(blockKey, block)
    })

    console.warn(`Splitted Block Counts: ${blockMap.size}`)

    blocks.value = []
    for (const [_key, values] of blockMap) {
      const points = createPoints(new Float32Array(values))
      const block = new Block(points)
      _onLoad(block)
      blocks.value.push(block)
    }
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
