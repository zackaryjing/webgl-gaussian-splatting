import { OrbitCamera } from './orbitCamera'
import { mat4, vec3, quat } from 'gl-matrix'

interface Gaussian {
  position: [number, number, number]
  color: [number, number, number]
  scale: [number, number, number]
  quat: [number, number, number, number]
}

export function createGaussianRenderer(
  canvas: HTMLCanvasElement,
  gaussians: Gaussian[],
) {
  const gl = canvas.getContext('webgl2')!
  const camera = new OrbitCamera()

  const vsSource = `#version 300 es
    precision mediump float;
    layout(location = 0) in vec3 a_position;
    layout(location = 1) in vec3 a_color;
    layout(location = 2) in vec3 a_scale;
    layout(location = 3) in vec4 a_quat;
    uniform mat4 u_view;
    uniform mat4 u_proj;
    out vec3 v_color;
    void main() {
      // Transform quad here later for elliptical splatting
      gl_PointSize = max(2.0, length(a_scale) * 10.0);
      gl_Position = u_proj * u_view * vec4(a_position, 1.0);
      v_color = a_color;
    }
  `

  const fsSource = `#version 300 es
    precision mediump float;
    in vec3 v_color;
    out vec4 outColor;
    void main() {
      float d = length(gl_PointCoord - vec2(0.5));
      float alpha = exp(-d * 8.0);
      outColor = vec4(v_color, alpha);
    }
  `

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

  const vao = gl.createVertexArray()!
  gl.bindVertexArray(vao)

  const posBuffer = gl.createBuffer()!
  const colorBuffer = gl.createBuffer()!
  const scaleBuffer = gl.createBuffer()!
  const quatBuffer = gl.createBuffer()!

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  const projMatrix = mat4.create()

  function updateAndRender() {
    const view = camera.getViewMatrix()

    const sorted = gaussians.map((g, i) => {
      const p = g.position
      const z = view[2] * p[0] + view[6] * p[1] + view[10] * p[2] + view[14]
      return { index: i, depth: -z }
    })
    sorted.sort((a, b) => a.depth - b.depth) // near to far

    const n = gaussians.length
    const positions = new Float32Array(n * 3)
    const colors = new Uint8Array(n * 3)
    const scales = new Float32Array(n * 3)
    const quats = new Float32Array(n * 4)

    for (let i = 0; i < n; i++) {
      const g = gaussians[sorted[i].index]
      positions.set(g.position, i * 3)
      colors.set(g.color, i * 3)
      scales.set(g.scale, i * 3)
      quats.set(g.quat, i * 4)
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(1, 3, gl.UNSIGNED_BYTE, true, 0, 0)
    gl.enableVertexAttribArray(1)

    gl.bindBuffer(gl.ARRAY_BUFFER, scaleBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, scales, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(2)

    gl.bindBuffer(gl.ARRAY_BUFFER, quatBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, quats, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(3)

    gl.useProgram(program)
    gl.uniformMatrix4fv(uView, false, view)
    mat4.perspective(projMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100)
    gl.uniformMatrix4fv(uProj, false, projMatrix)

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
  let lastX = 0, lastY = 0
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
  window.addEventListener('mouseup', () => dragging = false)
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    camera.zoom(e.deltaY > 0 ? 0.1 : -0.1)
  }, { passive: false })

  requestAnimationFrame(updateAndRender)
}
