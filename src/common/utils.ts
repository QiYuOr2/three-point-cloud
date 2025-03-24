import * as THREE from 'three'
import { POINT_SIZE } from './constants'

export function createPoints(positions: Float32Array) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({ size: POINT_SIZE, vertexColors: true })
  const points = new THREE.Points(geometry, material)

  return points
}

export function toNDCPosition(point: THREE.Vector2Like) {
  return {
    x: (point.x / window.innerWidth) * 2 - 1,
    y: -(point.y / window.innerHeight) * 2 + 1,
  }
}

export function to3DPosition(point: THREE.Vector2Like, camera: THREE.Camera) {
  // NDC坐标 -> 3D 世界坐标
  const vector = new THREE.Vector3(point.x, point.y, 0.5).unproject(camera)
  return vector
}

export function toScreenPosition(point: THREE.Vector3Like, camera: THREE.Camera) {
  const vector = new THREE.Vector3(point.x, point.y, point.z)
  vector.project(camera)
  return { x: vector.x, y: vector.y }
}

export type RGBArray = [number, number, number]
type RGBAArray = [number, number, number, number]
export function setColor(colors: THREE.TypedArray, index: number, value: RGBArray | RGBAArray) {
  colors[index] = value[0]
  colors[index + 1] = value[1]
  colors[index + 2] = value[2]
  colors[index + 3] = value[3] ?? 1
}

export function createHintBox(min: THREE.Vector3Like, max: THREE.Vector3Like) {
  const geometry = new THREE.BoxGeometry(max.x - min.x, max.y - min.y, max.z - min.z)
  const edges = new THREE.EdgesGeometry(geometry)
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x00FF00 }),
  )
  line.position.set(
    (min.x + max.x) / 2,
    (min.y + max.y) / 2,
    (min.z + max.z) / 2,
  )
  return line
}

type PositionLoop<T> = (point: T, pointIndex: number) => void
export function positionsToVector3Like<T extends THREE.TypedArray>(positions: T, onLoop?: PositionLoop<THREE.Vector3Like>): THREE.Vector3Like[] {
  const points = []
  for (let i = 0; i < positions.length / 3; i++) {
    const point = {
      x: positions[i * 3],
      y: positions[i * 3 + 1],
      z: positions[i * 3 + 2],
    }
    points.push(point)
    onLoop?.(point, i)
  }
  return points
}

export function positionsToVector3<T extends THREE.TypedArray>(positions: T, onLoop?: PositionLoop<THREE.Vector3>) {
  const points = []
  for (let i = 0; i < positions.length / 3; i++) {
    const point = new THREE.Vector3(
      positions[i * 3],
      positions[i * 3 + 1],
      positions[i * 3 + 2],
    )
    points.push(point)
    onLoop?.(point, i)
  }
  return points
}

function isVector3Like(vector: unknown): vector is THREE.Vector3Like {
  return (vector as THREE.Vector3Like).z !== undefined
}

export function vectorToTuple(vector: THREE.Vector2Like): [number, number]
export function vectorToTuple(vector: THREE.Vector3Like): [number, number, number]
export function vectorToTuple<T extends THREE.Vector2Like | THREE.Vector3Like>(vector: T) {
  if (isVector3Like(vector)) {
    return [vector.x, vector.y, vector.z]
  }
  return [vector.x, vector.y]
}

export type PCDPoints = THREE.Points<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.PointsMaterial, THREE.Object3DEventMap>
export function addVertexColor(points: PCDPoints) {
  if (!points.geometry.attributes.color) {
    const count = points.geometry.attributes.position.array.length / 3
    const colors = new Float32Array(count * 4)

    for (let i = 0; i < count; i++) {
      setColor(colors, i * 4, [1, 1, 1, 1])
    }

    points.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4))
    points.material.vertexColors = true
    points.material.transparent = true
  }
}

export function getVector3sBounds(vector3s: THREE.Vector3[]) {
  const box = new THREE.Box3().setFromPoints(vector3s)
  const { min, max } = box
  return { min, max }
}
