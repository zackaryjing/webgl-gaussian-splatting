// singleGaussian

import { OrbitCamera } from '@/utils/orbitCamera.ts'
import { mat4, vec3, quat } from 'gl-matrix'
import vsSource from './shader/shader.vs?raw'
import fsSource from './shader/shader.fs?raw'

export function createGaussianRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl2')!
  const camera = new OrbitCamera()

  const compileShader = (type: number, source: string) => {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader)!)
    }
    return shader
  }

  // === 中略：原始 vsSource、fsSource、compileShader 等你已有的代码不变 === //

  // 创建 shader program
  const program = gl.createProgram()!
  gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vsSource))
  gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fsSource))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program)!)
  }

  const uView = gl.getUniformLocation(program, 'u_view')
  const uProj = gl.getUniformLocation(program, 'u_proj')
  const uCanvasSize = gl.getUniformLocation(program, 'u_canvasSize')

  const vao = gl.createVertexArray()!
  gl.bindVertexArray(vao)

  // 构造一个高斯点（用于调试）
  const position = new Float32Array([0,0,0.5])
  const opacity = new Float32Array([0.9])
  // const scale = new Float32Array([0.0084044048, 0.0004749243, 0.0139186164])
  const scale = new Float32Array([0.5,1,1])
  // const quat = new Float32Array([0.83, 0.21, 0.05, -0.52])
  const quat = new Float32Array([0,0,0,1])
  const dc = [0.54, 0.56, 0.57]
  const sh = new Float32Array([
    ...dc, // a_dc
    ...Array(9).fill([0, 0, 0]).flat() // 其余 SH = 0
  ])
  // console.log("sh: ",sh)

  const posBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, position, gl.STATIC_DRAW)
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(0)

  const opacityBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, opacity, gl.STATIC_DRAW)
  gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(1)

  const scaleBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, scaleBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, scale, gl.STATIC_DRAW)
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(2)

  const quatBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, quatBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, quat, gl.STATIC_DRAW)
  gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(3)

  const shBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, shBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, sh, gl.STATIC_DRAW)
  const stride = 30 * 4
  for (let i = 0; i < 10; i++) {
    const loc = 4 + i
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, stride, i * 3 * 4)
    gl.enableVertexAttribArray(loc)
  }

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  const projMatrix = mat4.create()

  function updateAndRender() {
    const view = camera.getViewMatrix()

    gl.useProgram(program)
    gl.uniformMatrix4fv(uView, false, view)
    mat4.perspective(projMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100)
    gl.uniformMatrix4fv(uProj, false, projMatrix)
    gl.uniform2f(uCanvasSize, canvas.width, canvas.height)

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.bindVertexArray(vao)
    gl.drawArrays(gl.POINTS, 0, 1)
    gl.bindVertexArray(null)

    requestAnimationFrame(updateAndRender)
  }

  // 摄像机交互
  let dragging = false
  let lastX = 0,
    lastY = 0
  canvas.addEventListener('mousedown', (e) => {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
  })
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    camera.rotate(dx, dy)
  })
  window.addEventListener('mouseup', () => (dragging = false))
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      camera.zoom(e.deltaY > 0 ? 0.1 : -0.1)
    },
    { passive: false }
  )

  requestAnimationFrame(updateAndRender)
}
