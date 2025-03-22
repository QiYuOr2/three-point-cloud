import type { Camera, Points, TypedArray, Vector2Like } from 'three'
import { polygonHull } from 'd3-polygon'
import { Vector3 } from 'three'

export function toNDCPosition(event: MouseEvent | PointerEvent) {
  return {
    x: (event.clientX / window.innerWidth) * 2 - 1,
    y: -(event.clientY / window.innerHeight) * 2 + 1,
  }
}

export function toZPosition(camera: Camera, point: Vector2Like) {
  // NDC坐标 -> 3D 空间坐标  camera 视线方向上的一点
  const vector = new Vector3(point.x, point.y, 0).unproject(camera)
  // camera 指向 改点 的单位向量
  const direction = vector.sub(camera.position).normalize()
  // 投射在 z = 0 上的点
  const distance = -camera.position.z / direction.z
  const position = camera.position.clone().add(direction.multiplyScalar(distance))

  return position
}

export function computePolygonPoints(points: Vector3[]) {
  const computedPoints = polygonHull(points.map(point => [point.x, point.y]))

  if (!computedPoints) {
    return { points: [], array: [] }
  }

  computedPoints.push(computedPoints[0])

  return { points: computedPoints.map(([x, y]) => new Vector3(x, y, 0)), array: computedPoints }
}

type RGBArray = [number, number, number]
type RGBAArray = [number, number, number, number]
export function setColor(colors: TypedArray, index: number, value: RGBArray | RGBAArray) {
  colors[index] = value[0]
  colors[index + 1] = value[1]
  colors[index + 2] = value[2]
  colors[index + 3] = value[3] ?? 1
}
