import * as THREE from 'three'
import { POINT_SIZE } from './constants'

export function createPoints(positions: Float32Array) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({ size: POINT_SIZE, vertexColors: true })
  const points = new THREE.Points(geometry, material)

  return points
}

export function toNDCPosition(event: MouseEvent | PointerEvent) {
  return {
    x: (event.clientX / window.innerWidth) * 2 - 1,
    y: -(event.clientY / window.innerHeight) * 2 + 1,
  }
}

export function toZPosition(camera: THREE.Camera, point: THREE.Vector2Like) {
  // NDC坐标 -> 3D 空间坐标  camera 视线方向上的一点
  const vector = new THREE.Vector3(point.x, point.y, 0).unproject(camera)
  // camera 指向 改点 的单位向量
  const direction = vector.sub(camera.position).normalize()
  // 投射在 z = 0 上的点
  const distance = -camera.position.z / direction.z
  const position = camera.position.clone().add(direction.multiplyScalar(distance))

  return position
}

type RGBArray = [number, number, number]
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

export function positionsToVector3Like<T extends THREE.TypedArray>(positions: T, onLoop?: (point: THREE.Vector3Like) => void): THREE.Vector3Like[] {
  const points = []
  for (let i = 0; i < positions.length / 3; i++) {
    const point = {
      x: positions[i * 3],
      y: positions[i * 3 + 1],
      z: positions[i * 3 + 2],
    }
    points.push(point)
    onLoop?.(point)
  }
  return points
}

export function positionsToVector3<T extends THREE.TypedArray>(positions: T, onLoop?: (point: THREE.Vector3) => void) {
  const points = []
  for (let i = 0; i < positions.length / 3; i++) {
    const point = new THREE.Vector3(
      positions[i * 3],
      positions[i * 3 + 1],
      positions[i * 3 + 2],
    )
    points.push(point)
    onLoop?.(point)
  }
  return points
}

export function vectorToTuple(vector: THREE.Vector2Like): [number, number] {
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
