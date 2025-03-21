import type * as THREE from 'three'
import type { MaybeRef } from 'vue'
import { PCDLoader } from 'three/examples/jsm/loaders/PCDLoader.js'
import { ref, toRaw, unref, watch } from 'vue'

type PCDPoints = THREE.Points<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.PointsMaterial, THREE.Object3DEventMap>

interface UsePCDOptions {
  file?: MaybeRef<string>
  onLoad: (points: PCDPoints, oldPoints?: PCDPoints) => void
}

export interface InjectUsePCD {
  loadPCDFile: (data: ArrayBuffer | string) => void
}

export function usePCD({ file, onLoad }: UsePCDOptions) {
  const loader = new PCDLoader()
  const pcdObject = ref<PCDPoints>()

  if (file) {
    watch(() => unref(file), async (value) => {
      const points = await loader.loadAsync(value)
      onLoad(points, toRaw(pcdObject.value))

      pcdObject.value = points
    }, { immediate: true })
  }

  const loadPCDFile = (data: ArrayBuffer | string) => {
    const points = loader.parse(data)
    onLoad(points, toRaw(pcdObject.value))

    pcdObject.value = points
  }

  return { pcdObject, loadPCDFile }
}
