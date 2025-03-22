import type { MaybeRef } from 'vue'
import * as THREE from 'three'
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js'
import { ref, toRaw, unref, watch } from 'vue'
import { POINT_SIZE } from '../common/constants'

type PCDPoints = THREE.Points<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.PointsMaterial, THREE.Object3DEventMap>

export enum PCDType {
  Full,
  Part,
}

export interface PointsWithType {
  type: PCDType
  points: PCDPoints
}

export interface PartOfPCD {
  type: PCDType.Part
  positions: Float32Array
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
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(partOfData.positions, 3))

    const material = new THREE.PointsMaterial({ size: POINT_SIZE, vertexColors: true })
    const points = new THREE.Points(geometry, material)
    const obj = { type: partOfData.isFinish ? PCDType.Full : partOfData.type, points }
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
