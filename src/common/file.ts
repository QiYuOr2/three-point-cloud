export interface PCDHeader {
  SIZE: number[]
  POINTS: number
  pointSize: number
  FIELDS: string[]
}

/**
 * Header 格式
 * ```bash
 * # .PCD v0.7 - Point Cloud Data file format
 * VERSION 0.7
 * FIELDS x y z
 * SIZE 4 4 4
 * TYPE F F F
 * COUNT 1 1 1
 * WIDTH 18049141
 * HEIGHT 1
 * VIEWPOINT 0 0 0 1 0 0 0
 * POINTS 18049141
 * DATA binary
 * ```
 */
export function readHeader(unit8Array: Uint8Array) {
  const decoder = new TextDecoder('utf-8')

  let header = ''
  let headerUnit8Array = new Uint8Array()
  let headerLength = 0
  for (let i = 0; i < unit8Array.length; i++) {
    header += decoder.decode(unit8Array.subarray(i, i + 1))
    if (header.match(/DATA\s+(binary|ascii)\s+/)) {
      headerLength = i + 1
      headerUnit8Array = unit8Array.slice(0, headerLength)
      break
    }
  }

  const headerItemFormat: Record<string, (value: string[]) => any> = {
    SIZE: (value: string[]) => value.map(item => Number(item)),
    POINTS: (value: string[]) => Number(value[0]),
  }

  const headerObject = header
    .split('\n')
    .filter(line => line.trim() !== '')
    .reduce<PCDHeader>((result, line) => {
      const [key, ...value] = line.trim().split(/\s+/)
      const format = headerItemFormat[key] ?? ((value: string[]) => value)
      result[key as keyof PCDHeader] = format(value)
      return result
    }, {} as PCDHeader)

  headerObject.pointSize = (headerObject.SIZE as number[]).reduce((a, b) => a + b, 0)

  return { headerText: header, headerLength, headerObject, headerUnit8Array }
}

export function mergeTypeArray<T extends Uint8Array | Float32Array>(dataA: T, dataB: T, fn: { new (length: number): T }) {
  const mergedArray = new fn(dataA.length + dataB.length)
  mergedArray.set(dataA, 0)
  mergedArray.set(dataB, dataA.length)

  return mergedArray
}

export function binaryDataHandler(data: Uint8Array, header: PCDHeader) {
  const pointsInChunk = Math.floor(data.byteLength / header.pointSize)
  const usefulLength = pointsInChunk * header.pointSize

  const dataView = new DataView(data.buffer, data.byteOffset, usefulLength)

  // x, y, z 分别的偏移量
  const fieldOffsets: number[] = []
  let currentOffset = 0
  for (let i = 0; i < header.SIZE.length; i++) {
    fieldOffsets.push(currentOffset)
    currentOffset += header.SIZE[i]
  }

  let pointIndex = 0
  let totalOffset = 0

  const offsetInPosition: Record<string, number> = Object.fromEntries(
    ['x', 'y', 'z'].map((field, i) => [field, i]),
  )

  const positions = new Float32Array(pointsInChunk * 3)

  while (pointIndex < pointsInChunk) {
    header.FIELDS.forEach((field, i) => {
      if (field in offsetInPosition) {
        const offset = totalOffset + fieldOffsets[i]
        const value = dataView.getFloat32(offset, true)
        const index = pointIndex * 3 + offsetInPosition[field]
        positions[index] = value
      }
    })

    totalOffset += header.pointSize
    pointIndex++
  }

  const remainingBytes = data.byteLength % header.pointSize
  const otherData = remainingBytes > 0 ? data.slice(-remainingBytes) : new Uint8Array()

  return { otherData, positions }
}
