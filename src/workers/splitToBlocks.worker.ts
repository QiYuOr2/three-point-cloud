import { PCD_SPLIT_NUM } from '../common/constants'
import { positionsToVector3Like } from '../common/utils'

globalThis.onmessage = async (event) => {
  const { positions, min, max } = event.data

  const blockMap = new Map()

  const blockSize = [
    (max.x - min.x) / PCD_SPLIT_NUM,
    (max.y - min.y) / PCD_SPLIT_NUM,
    (max.z - min.z) / PCD_SPLIT_NUM,
  ]

  globalThis.postMessage({ step: [0, 1] })
  positionsToVector3Like(positions, ({ x, y, z }) => {
    // 利用 相对于点云最小位置的偏移量 来计算该点在哪个位置
    const blockX = Math.floor((x - min.x) / blockSize[0])
    const blockY = Math.floor((y - min.y) / blockSize[1])
    const blockZ = Math.floor((z - min.z) / blockSize[2])
    const blockKey = `${blockX}_${blockY}_${blockZ}`

    if (!blockMap.has(blockKey)) {
      blockMap.set(blockKey, [])
    }

    const block = blockMap.get(blockKey)!
    block.push(x, y, z)

    blockMap.set(blockKey, block)
  })

  for (const [key, values] of blockMap) {
    globalThis.postMessage({
      blockValues: values,
      step: [Array.from(blockMap.keys()).indexOf(key), blockMap.size],
    })
  }
  globalThis.postMessage({ step: [1, 1] })
}
