import * as THREE from 'three'
import { polygonContains } from '../common/polygon'
import { positionsToVector3Like, toScreenPosition } from '../common/utils'

interface OnMessageData {
  blockIndex: number
  screenLassoPoints: THREE.Vector2Like[]
  positions: THREE.TypedArray
  colors: THREE.TypedArray
  camera: {
    projectionMatrix: number[]
    matrixWorldInverse: number[]
  }
}

globalThis.onmessage = async (event: MessageEvent<OnMessageData>) => {
  const { blockIndex, positions, camera: cameraData, screenLassoPoints } = event.data

  const camera = new THREE.PerspectiveCamera()
  camera.projectionMatrix.fromArray(cameraData.projectionMatrix)
  camera.matrixWorldInverse.fromArray(cameraData.matrixWorldInverse)

  const visibleIndexes: number[] = []
  const hiddenIndexes: number[] = []
  positionsToVector3Like(positions, (point, pointIndex) => {
    if (polygonContains(screenLassoPoints, toScreenPosition(point, camera))) {
      // block.addWillColoringPoint(pointIndex)
      visibleIndexes.push(pointIndex)
      return
    }
    hiddenIndexes.push(pointIndex)
  })
  globalThis.postMessage({ blockIndex, visibleIndexes, hiddenIndexes })
}
