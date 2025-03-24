import type * as THREE from 'three'
import { polygonContains as polygonContains2D } from 'd3-polygon'
import { vectorToTuple } from './utils'

export interface Bounds {
  min: THREE.Vector3Like
  max: THREE.Vector3Like
}

export enum PolygonRelation {
  /**
   * 相交或包含
   */
  IntersectingOrContains,
  /**
   * 相离
   */
  Separated,
}

/**
 * 有任意一点在多边形中
 */
function anyPointInPolygon(points: THREE.Vector2Like[], polygon: THREE.Vector2Like[]) {
  return points.some(point => polygonContains(polygon, point))
}

/**
 * polygon 的所有点都在 wrapper 中
 */
export function isContainsPolygon(wrapper: THREE.Vector2Like[], polygon: THREE.Vector2Like[]) {
  return polygon.every(point => polygonContains(wrapper, point))
}

/**
 * 判断两个多边形的关系
 */
export function checkPolygonRelation(polygonA: THREE.Vector2Like[], polygonB: THREE.Vector2Like[]) {
  if (!polygonA.length || !polygonB.length) {
    return PolygonRelation.Separated
  }
  if (anyPointInPolygon(polygonA, polygonB) || anyPointInPolygon(polygonB, polygonA)) {
    return PolygonRelation.IntersectingOrContains
  }
  return PolygonRelation.Separated
}

export function vector3boundsToVertices({ min, max }: Bounds): THREE.Vector3Like[] {
  return [
    { x: min.x, y: min.y, z: min.z },
    { x: min.x, y: min.y, z: max.z },
    { x: min.x, y: max.y, z: min.z },
    { x: min.x, y: max.y, z: max.z },
    { x: max.x, y: min.y, z: min.z },
    { x: max.x, y: min.y, z: max.z },
    { x: max.x, y: max.y, z: min.z },
    { x: max.x, y: max.y, z: max.z },
  ]
}

export function polygonContains(polygon: THREE.Vector2Like[], point: THREE.Vector2Like) {
  if (polygon.length < 3) {
    return false
  }

  const polygon2D: Array<[number, number]> = polygon.map((point) => {
    return [point.x, point.y]
  })
  const point2D: [number, number] = vectorToTuple(point)

  return polygonContains2D(polygon2D, point2D)
}
