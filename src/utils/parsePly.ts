// src/utils/parsePly.ts

export interface PlyBufferData {
  vertexCount: number
  positions: Float32Array // [x1, y1, z1, x2, y2, z2, ...]
  colors: Uint8Array // [r1, g1, b1, r2, g2, b2, ...]
}

export async function loadPlyBinary(): Promise<PlyBufferData> {
  const response = await fetch('/models/Tree.ply') // ⚠️ 确保在 public 目录
  const arrayBuffer = await response.arrayBuffer()
  const dataView = new DataView(arrayBuffer)

  let offset = 0
  let header = ''
  while (true) {
    const byte = dataView.getUint8(offset++)
    header += String.fromCharCode(byte)
    if (header.endsWith('end_header\n')) break
  }

  const vertexCount = 279910
  const stride = 15 // bytes per vertex (float*3 + uchar*3)

  const positions = new Float32Array(vertexCount * 3)
  const colors = new Uint8Array(vertexCount * 3)

  for (let i = 0; i < vertexCount; i++) {
    let ptr = offset + i * stride

    positions[i * 3 + 0] = dataView.getFloat32(ptr, true)
    ptr += 4
    positions[i * 3 + 1] = dataView.getFloat32(ptr, true)
    ptr += 4
    positions[i * 3 + 2] = dataView.getFloat32(ptr, true)
    ptr += 4

    colors[i * 3 + 0] = dataView.getUint8(ptr++)
    colors[i * 3 + 1] = dataView.getUint8(ptr++)
    colors[i * 3 + 2] = dataView.getUint8(ptr++)
  }

  return {
    vertexCount,
    positions,
    colors,
  }
}

// src/utils/parsePly.ts

export interface PlyPoint {
  x: number
  y: number
  z: number
  r: number
  g: number
  b: number
}

export interface PlyData {
  vertexCount: number
  samplePoints: PlyPoint[]
}

export async function loadPlyFromAssets(): Promise<PlyData> {
  const response = await fetch('/models/Tree.ply')
  const arrayBuffer = await response.arrayBuffer()
  const dataView = new DataView(arrayBuffer)

  // --- 手动处理头部 ---
  let offset = 0
  const textDecoder = new TextDecoder()
  let header = ''
  while (true) {
    const byte = dataView.getUint8(offset++)
    header += String.fromCharCode(byte)
    if (header.endsWith('end_header\n')) break
  }

  // 你已经给出点数和字段顺序，直接硬编码
  const vertexCount = 279910
  const pointStride = 3 * 4 + 3 * 1 // 3 float + 3 uchar = 15 bytes
  const sampleCount = Math.min(10, vertexCount) // 只读取前 10 个点做展示
  const samplePoints: PlyPoint[] = []

  for (let i = 0; i < sampleCount; i++) {
    let ptr = offset + i * pointStride

    const x = dataView.getFloat32(ptr, true)
    ptr += 4
    const y = dataView.getFloat32(ptr, true)
    ptr += 4
    const z = dataView.getFloat32(ptr, true)
    ptr += 4

    const r = dataView.getUint8(ptr++)
    const g = dataView.getUint8(ptr++)
    const b = dataView.getUint8(ptr++)

    samplePoints.push({ x, y, z, r, g, b })
  }

  return {
    vertexCount,
    samplePoints,
  }
}
