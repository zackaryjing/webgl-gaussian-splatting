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
  let vertexCount = 0

  while (true) {
    const byte = dataView.getUint8(offset++)
    header += String.fromCharCode(byte)
    if (header.endsWith('end_header\n')) break
  }

  // 解析 vertexCount
  const lines = header.split('\n')
  for (const line of lines) {
    if (line.startsWith('element vertex')) {
      const parts = line.trim().split(/\s+/)
      vertexCount = parseInt(parts[2], 10)
      break
    }
  }

  const stride = 15 // bytes per vertex (float*3 + uchar*3)

  const positions = new Float32Array(vertexCount * 3)
  const colors = new Uint8Array(vertexCount * 3)

  for (let i = 0; i < vertexCount; i++) {
    let ptr = offset + i * stride

    // model xyz equals webgl xzy
    positions[i * 3 + 0] = dataView.getFloat32(ptr, true)
    ptr += 4
    positions[i * 3 + 2] = dataView.getFloat32(ptr, true)
    ptr += 4
    positions[i * 3 + 1] = dataView.getFloat32(ptr, true)
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

export async function loadPlyBinary2(): Promise<PlyBufferData> {
  const response = await fetch('/models/cactus_splat3_30kSteps_142k_splats.ply')
  const arrayBuffer = await response.arrayBuffer()
  const dataView = new DataView(arrayBuffer)

  let offset = 0
  let header = ''
  while (true) {
    const byte = dataView.getUint8(offset++)
    header += String.fromCharCode(byte)
    if (header.endsWith('end_header\n')) break
  }

  const lines = header.split('\n')
  let vertexCount = 0
  const properties: { name: string; type: string }[] = []

  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts[0] === 'element' && parts[1] === 'vertex') {
      vertexCount = parseInt(parts[2])
    } else if (parts[0] === 'property') {
      properties.push({ type: parts[1], name: parts[2] })
    }
  }

  // 确定字段索引
  const indexOf = (name: string) => properties.findIndex((p) => p.name === name)
  const idxX = indexOf('x')
  const idxY = indexOf('y')
  const idxZ = indexOf('z')
  const idxDc0 = indexOf('f_dc_0')
  const idxDc1 = indexOf('f_dc_1')
  const idxDc2 = indexOf('f_dc_2')

  if (idxX < 0 || idxY < 0 || idxZ < 0 || idxDc0 < 0) {
    throw new Error('Required fields not found in PLY header')
  }

  const floatsPerVertex = properties.filter((p) => p.type === 'float').length
  const stride = floatsPerVertex * 4

  const positions = new Float32Array(vertexCount * 3)
  const colors = new Uint8Array(vertexCount * 3) // 从 SH DC 提取颜色

  for (let i = 0; i < vertexCount; i++) {
    const ptr = offset + i * stride
    const floats: number[] = []

    for (let j = 0; j < floatsPerVertex; j++) {
      floats.push(dataView.getFloat32(ptr + j * 4, true))
    }

    // 位置：注意 xzy 排序
    positions[i * 3 + 0] = floats[idxX]
    positions[i * 3 + 1] = -floats[idxY]
    positions[i * 3 + 2] = floats[idxZ]

    // 颜色来自 f_dc_*
    const r = Math.round(Math.max(0, Math.min(1, floats[idxDc0])) * 255)
    const g = Math.round(Math.max(0, Math.min(1, floats[idxDc1])) * 255)
    const b = Math.round(Math.max(0, Math.min(1, floats[idxDc2])) * 255)

    colors[i * 3 + 0] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b
  }

  return {
    vertexCount,
    positions,
    colors,
  }
}

export interface GaussianSimply {
  position: [number, number, number]
  color: [number, number, number]
  scale: [number, number, number]
  quat: [number, number, number, number]
}

export async function loadPlyBinaryFullSpec1(): Promise<GaussianSimply[]> {
  const response = await fetch('/models/Tree.ply') // Special for this model
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
  const stride = 4 * 3 + 1 * 3 + 4 * 3 + 4 * 1 // float*3 + uchar*3 + float*3 + float*4 = 52 bytes

  const points: GaussianSimply[] = []

  for (let i = 0; i < vertexCount; i++) {
    let ptr = offset + i * stride

    const x = dataView.getFloat32(ptr, true)
    ptr += 4
    const y = dataView.getFloat32(ptr, true)
    ptr += 4
    const z = dataView.getFloat32(ptr, true)
    ptr += 4

    const r = dataView.getUint8(ptr++),
      g = dataView.getUint8(ptr++),
      b = dataView.getUint8(ptr++)

    const s0 = dataView.getFloat32(ptr, true)
    ptr += 4
    const s1 = dataView.getFloat32(ptr, true)
    ptr += 4
    const s2 = dataView.getFloat32(ptr, true)
    ptr += 4

    const qx = dataView.getFloat32(ptr, true)
    ptr += 4
    const qy = dataView.getFloat32(ptr, true)
    ptr += 4
    const qz = dataView.getFloat32(ptr, true)
    ptr += 4
    const qw = dataView.getFloat32(ptr, true)
    ptr += 4

    points.push({
      position: [x, z, y], // 注意：xzy 顺序
      color: [r, g, b],
      scale: [s0, s1, s2],
      quat: [qx, qy, qz, qw],
    })
  }

  return points
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




export async function loadTreePlyFromAssets(): Promise<PlyData> {
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

export interface Gaussian {
  position: [number, number, number]
  sh: number[]
  opacity: number
  scale: [number, number, number]
  quat: [number, number, number, number]
}

export async function loadPlyBinaryFullSpec2(): Promise<Gaussian[]> {
  const response = await fetch('/models/cactus_splat3_30kSteps_142k_splats.ply')
  const arrayBuffer = await response.arrayBuffer()
  const dataView = new DataView(arrayBuffer)

  // --- Parse header ---
  let offset = 0
  let header = ''
  while (true) {
    const byte = dataView.getUint8(offset++)
    header += String.fromCharCode(byte)
    if (header.endsWith('end_header\n')) break
  }

  const lines = header.split('\n')
  let vertexCount = 0
  const properties: { name: string; type: string }[] = []

  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts[0] === 'element' && parts[1] === 'vertex') {
      vertexCount = parseInt(parts[2], 10)
    } else if (parts[0] === 'property') {
      properties.push({ type: parts[1], name: parts[2] })
    }
  }

  const floatsPerVertex = properties.filter((p) => p.type === 'float').length
  const stride = floatsPerVertex * 4 // each float is 4 bytes

  const gaussians: Gaussian[] = []

  for (let i = 0; i < vertexCount; i++) {
    const ptrBase = offset + i * stride
    let ptr = ptrBase

    const readFloat = () => {
      const val = dataView.getFloat32(ptr, true)
      ptr += 4
      return val
    }

    const values = properties.map((p) => readFloat())

    const fieldMap = Object.fromEntries(properties.map((p, i) => [p.name, values[i]]))

    const position: [number, number, number] = [
      fieldMap['x'],
      fieldMap['z'], // 注意 xzy 顺序
      fieldMap['y'],
    ]

    const sh: number[] = []
    for (let i = 0; i < 3; i++) {
      sh.push(fieldMap[`f_dc_${i}`])
    }
    for (let i = 0; i < 27; i++) {
      sh.push(fieldMap[`f_rest_${i}`])
    }

    const opacity = fieldMap['opacity']
    const scale: [number, number, number] = [
      fieldMap['scale_0'],
      fieldMap['scale_1'],
      fieldMap['scale_2'],
    ]
    const quat: [number, number, number, number] = [
      fieldMap['rot_0'],
      fieldMap['rot_1'],
      fieldMap['rot_2'],
      fieldMap['rot_3'],
    ]

    gaussians.push({ position, sh, opacity, scale, quat })
  }

  console.log(`Loaded ${gaussians.length} gaussians`)

  // 打印第一个点的部分数据确认
  if (gaussians.length > 0) {
    const first = gaussians[0]
    console.log('First Gaussian position:', first.position)
    console.log('First Gaussian SH coefficients length:', first.sh.length)
    console.log('First Gaussian SH coefficients (first 9 floats):', first.sh.slice(0, 9))
    console.log('First Gaussian opacity:', first.opacity)
    console.log('First Gaussian scale:', first.scale)
    console.log('First Gaussian quaternion:', first.quat)
  }

  return gaussians
}

export async function loadCactusPlyFromAssets(): Promise<Gaussian[]> {
  const response = await fetch('/models/cactus_splat3_30kSteps_142k_splats.ply')
  const arrayBuffer = await response.arrayBuffer()
  const dataView = new DataView(arrayBuffer)

  // --- Parse header ---
  let offset = 0
  let header = ''
  while (true) {
    const byte = dataView.getUint8(offset++)
    header += String.fromCharCode(byte)
    if (header.endsWith('end_header\n')) break
  }

  const lines = header.split('\n')
  let vertexCount = 0
  const properties: { name: string; type: string }[] = []

  for (const line of lines) {
    const parts = line.trim().split(/\s+/)
    if (parts[0] === 'element' && parts[1] === 'vertex') {
      vertexCount = parseInt(parts[2], 10)
    } else if (parts[0] === 'property') {
      properties.push({ type: parts[1], name: parts[2] })
      // console.log(parts[1],parts[2],parts[0])
    }
  }

  const floatsPerVertex = properties.filter((p) => p.type === 'float').length
  const stride = floatsPerVertex * 4 // each float is 4 bytes

  const gaussians: Gaussian[] = []

  for (let i = 0; i < 10; i++) {
    const ptrBase = offset + i * stride
    let ptr = ptrBase

    const readFloat = () => {
      const val = dataView.getFloat32(ptr, true)
      ptr += 4
      return val
    }

    const values = properties.map((p) => readFloat())

    const fieldMap = Object.fromEntries(properties.map((p, i) => [p.name, values[i]]))

    const position: [number, number, number] = [
      fieldMap['x'],
      fieldMap['z'], // 注意 xzy 顺序
      fieldMap['y'],
    ]

    const sh: number[] = []
    for (let i = 0; i < 3; i++) {
      sh.push(fieldMap[`f_dc_${i}`])
    }
    for (let i = 0; i < 27; i++) {
      sh.push(fieldMap[`f_rest_${i}`])
    }

    const opacity = fieldMap['opacity']
    const scale: [number, number, number] = [
      fieldMap['scale_0'],
      fieldMap['scale_1'],
      fieldMap['scale_2'],
    ]
    const quat: [number, number, number, number] = [
      fieldMap['rot_0'],
      fieldMap['rot_1'],
      fieldMap['rot_2'],
      fieldMap['rot_3'],
    ]

    gaussians.push({ position, sh, opacity, scale, quat })
  }

  console.log(`Loaded ${gaussians.length} gaussians`)

  // 打印第一个点的部分数据确认
  if (gaussians.length > 0) {
    const first = gaussians[0]
    console.log('First Gaussian position:', first.position)
    console.log('First Gaussian SH coefficients length:', first.sh.length)
    console.log('First Gaussian SH coefficients (first 9 floats):', first.sh.slice(0, 9))
    console.log('First Gaussian opacity:', first.opacity)
    console.log('First Gaussian scale:', first.scale)
    console.log('First Gaussian quaternion:', first.quat)
  }
  return gaussians
}
