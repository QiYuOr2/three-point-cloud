import type { MaybeRef } from 'vue'
import * as THREE from 'three'
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js'
import { ref, toRaw, unref, watch } from 'vue'
import { PCD_SPLIT_NUM, POINT_SIZE } from '../common/constants'

type PCDPoints = THREE.Points<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.PointsMaterial, THREE.Object3DEventMap>

export enum PCDType {
  Full,
  Part,
}

interface Bounds {
  min: [number, number, number]
  max: [number, number, number]
}

export interface PointsWithType {
  type: PCDType
  points: PCDPoints
  bounds?: Bounds
}

export interface PartOfPCD {
  type: PCDType.Part
  positions: Float32Array
  bounds: Bounds
  isFinish?: boolean
}
export interface FullPCD {
  type: PCDType.Full
  data: ArrayBuffer | string
}

export type PCDPack = PartOfPCD | FullPCD

function isPartOfPCD(value: unknown): value is PartOfPCD {
  return (value as PCDPack).type === PCDType.Part
}

interface UsePCDOptions {
  file?: MaybeRef<string>
  onLoad: (points: PointsWithType, oldPoints: PointsWithType) => void
}

export function usePCD({ file, onLoad }: UsePCDOptions) {
  const loader = new PCDLoader()
  const pcdObject = ref<PointsWithType>({} as PointsWithType)

  if (file) {
    watch(() => unref(file), async (value) => {
      const points = await loader.loadAsync(value)
      const obj = { type: PCDType.Full, points }
      onLoad(obj, toRaw(pcdObject.value))

      pcdObject.value = obj
    }, { immediate: true })
  }

  const loadPartOfPCDFile = (partOfData: PartOfPCD) => {
    const blocks = new Map<string, Array<number>>()

    const { min, max } = partOfData.bounds
    const blockSize = [
      (max[0] - min[0]) / PCD_SPLIT_NUM,
      (max[1] - min[1]) / PCD_SPLIT_NUM,
      (max[2] - min[2]) / PCD_SPLIT_NUM,
    ]

    const positions = partOfData.positions
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i]
      const y = positions[i + 1]
      const z = positions[i + 2]

      // 计算点所在的 block 索引
      const blockX = Math.floor((x - min[0]) / blockSize[0])
      const blockY = Math.floor((y - min[1]) / blockSize[1])
      const blockZ = Math.floor((z - min[2]) / blockSize[2])
      const blockKey = `${blockX}_${blockY}_${blockZ}`

      // 初始化 block
      if (!blocks.has(blockKey)) {
        blocks.set(blockKey, [])
      }

      // 将点添加到 block
      const block = blocks.get(blockKey)!
      block.push(x, y, z)

      blocks.set(blockKey, block)
    }

    // console.log(Array.from(blocks.values())[0])

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Array.from(blocks.values())[0]), 3))

    const material = new THREE.PointsMaterial({ size: POINT_SIZE, vertexColors: true })
    const points = new THREE.Points(geometry, material)
    const obj = {
      type: partOfData.isFinish ? PCDType.Full : partOfData.type,
      points,
      bounds: partOfData.bounds,
    }
    onLoad(obj, toRaw(pcdObject.value))

    pcdObject.value = obj
  }

  const loadPCDFile = (pcd: PCDPack) => {
    if (isPartOfPCD(pcd)) {
      loadPartOfPCDFile(pcd)
      return
    }

    const points = loader.parse(pcd.data)
    const obj = { type: PCDType.Full, points }
    onLoad(obj, toRaw(pcdObject.value))

    pcdObject.value = obj
  }

  return { pcdObject, loadPCDFile }
}
