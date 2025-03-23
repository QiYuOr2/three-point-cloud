import type { PCDHeader } from '../common/file'
import { SPLITED_FILE_SIZE } from '../common/constants'
import { binaryDataHandler, mergeTypeArray, readHeader } from '../common/file'
import { positionsToVector3Like } from '../common/utils'

globalThis.onmessage = async (event) => {
  const { fileStream } = event.data
  const reader = fileStream.getReader()

  let data = new Uint8Array()
  let header = ''
  let headerObject = {} as PCDHeader
  let totalPositions = new Float32Array()

  // 计算边界值
  let [minX, minY, minZ] = [Infinity, Infinity, Infinity]
  let [maxX, maxY, maxZ] = [-Infinity, -Infinity, -Infinity]

  while (true) {
    const { value, done } = await reader.read()

    if (done) {
      break
    }

    if (!header) {
      const { headerText, headerObject: _headerObj, headerLength } = readHeader(value)
      header = headerText
      headerObject = _headerObj

      const otherData = value.slice(headerLength)
      data = new Uint8Array(otherData.length)
      data.set(otherData)
      continue
    }

    data = mergeTypeArray(data, value, Uint8Array)

    if (data.byteLength >= SPLITED_FILE_SIZE || value.byteLength < SPLITED_FILE_SIZE) {
      const { otherData, positions } = binaryDataHandler(data, headerObject)

      positionsToVector3Like(positions, ({ x, y, z }) => {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        minZ = Math.min(minZ, z)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
        maxZ = Math.max(maxZ, z)
      })

      totalPositions = mergeTypeArray(totalPositions, positions, Float32Array)
      data = otherData

      globalThis.postMessage({
        // 分步加载会卡顿，只发送加载进度
        // positions: totalPositions,
        // bounds: {
        //   min: { x: minX, y: minY, z: minZ },
        //   max: { x: maxX, y: maxY, z: maxZ },
        // },
        step: [totalPositions.length / 3, headerObject.POINTS],
      })
    }
  }

  globalThis.postMessage({
    positions: totalPositions,
    bounds: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    },
    step: [totalPositions.length / 3, headerObject.POINTS],
  })
}
