import { OrbitCamera } from './orbitCamera'
import { mat4, vec3, quat } from 'gl-matrix'
import { type Gaussian } from '@/utils/parsePly'
import vsSource from './shader/shader.vs?raw'
import fsSource from './shader/shader.fs?raw'

export function createGaussianRenderer(canvas: HTMLCanvasElement, gaussians: Gaussian[]) {
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

  const posBuffer = gl.createBuffer()!
  const opacityBuffer = gl.createBuffer()!
  const scaleBuffer = gl.createBuffer()!
  const quatBuffer = gl.createBuffer()!
  const shBuffer = gl.createBuffer()!

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  const projMatrix = mat4.create()

  function updateAndRender() {
    const view = camera.getViewMatrix()

    const sorted = gaussians.map((g, i) => {
      const p = g.position
      const z = view[2] * p[0] + view[6] * p[1] + view[10] * p[2] + view[14]
      return { index: i, depth: z }
    })
    sorted.sort((a, b) => a.depth - b.depth)

    const n = gaussians.length
    const positions = new Float32Array(n * 3)
    const opacities = new Float32Array(n)
    const scales = new Float32Array(n * 3)
    const quats = new Float32Array(n * 4)
    const shs = new Float32Array(n * 30)

    for (let i = 0; i < n; i++) {
      const g = gaussians[sorted[i].index]
      positions.set(g.position, i * 3)
      opacities[i] = g.opacity ?? 1.0
      scales.set(g.scale, i * 3)
      quats.set(g.quat, i * 4)
      shs.set(g.sh, i * 30)
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)

    gl.bindBuffer(gl.ARRAY_BUFFER, opacityBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, opacities, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(1)

    gl.bindBuffer(gl.ARRAY_BUFFER, scaleBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, scales, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(2)

    gl.bindBuffer(gl.ARRAY_BUFFER, quatBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, quats, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(3)

    gl.bindBuffer(gl.ARRAY_BUFFER, shBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, shs, gl.DYNAMIC_DRAW)
    const stride = 30 * 4
    for (let i = 0; i < 10; i++) {
      const loc = 4 + i
      gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, stride, i * 3 * 4)
      gl.enableVertexAttribArray(loc)
    }


    gl.useProgram(program)
    gl.uniformMatrix4fv(uView, false, view)
    mat4.perspective(projMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100)
    gl.uniformMatrix4fv(uProj, false, projMatrix)
    gl.uniform2f(uCanvasSize, canvas.width, canvas.height)

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.bindVertexArray(vao)
    gl.drawArrays(gl.POINTS, 0, n)
    gl.bindVertexArray(null)

    requestAnimationFrame(updateAndRender)
  }

  // Camera interaction events
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
    { passive: false },
  )

  requestAnimationFrame(updateAndRender)
}
