import type { Vector2Like, Vector3Like } from 'three'
import { polygonContains, polygonHull } from 'd3-polygon'
import { Vector3 } from 'three'
import { vectorToTuple } from './utils'

export interface Bounds {
  min: Vector3Like
  max: Vector3Like
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

export function computePolygonPoints(points: Vector3[]) {
  const computedPoints = polygonHull(points.map(point => [point.x, point.y]))

  if (!computedPoints) {
    return { points: [], tuple: [] }
  }

  computedPoints.push(computedPoints[0])

  return { points: computedPoints.map(([x, y]) => new Vector3(x, y, 0)), tuple: computedPoints }
}

function anyPointInPolygon(points: Vector2Like[], polygon: Vector2Like[]) {
  const convertedPolygon = polygon.map(vectorToTuple)

  return points.some(point => polygonContains(convertedPolygon, vectorToTuple(point)))
}

/**
 * 判断同一平面上两个多边形的关系
 */
export function checkPolygonRelation(polygonA: Vector2Like[], polygonB: Vector2Like[]) {
  if (!polygonA.length || !polygonB.length) {
    return PolygonRelation.Separated
  }
  if (anyPointInPolygon(polygonA, polygonB) || anyPointInPolygon(polygonB, polygonA)) {
    return PolygonRelation.IntersectingOrContains
  }
  return PolygonRelation.Separated
}

export function vector3boundsToRectVertices({ min, max }: Bounds) {
  return polygonHull([
    [min.x, min.y],
    [max.x, min.y],
    [min.x, max.y],
    [max.x, max.y],
  ])!.map(([x, y]) => ({ x, y }))
}
