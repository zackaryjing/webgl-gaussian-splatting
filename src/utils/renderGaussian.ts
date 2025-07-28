import { OrbitCamera } from './orbitCamera'
import { mat4, vec4 } from 'gl-matrix'

export function createGaussianRenderer(
  canvas: HTMLCanvasElement,
  positions: Float32Array,
  colors: Uint8Array,
) {
  const gl = canvas.getContext('webgl2')!
  const camera = new OrbitCamera()

  const vsSource = `#version 300 es
    precision mediump float;
    layout(location = 0) in vec3 a_position;
    layout(location = 1) in vec3 a_color;
    uniform mat4 u_view;
    uniform mat4 u_proj;
    out vec3 v_color;
    void main() {
      gl_Position = u_proj * u_view * vec4(a_position, 1.0);
      gl_PointSize = 40.0 / -gl_Position.z;
      v_color = a_color;
    }
  `

  const fsSource = `#version 300 es
    precision mediump float;
    in vec3 v_color;
    out vec4 outColor;
    void main() {
      vec2 p = gl_PointCoord * 2.0 - 1.0;
      float d2 = dot(p, p);
      float intensity = exp(-d2 * 4.0); // Gaussian drop-off
      if (intensity < 0.01) discard;
      outColor = vec4(v_color * intensity, intensity);
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
  gl.useProgram(program)

  const vao = gl.createVertexArray()!
  gl.bindVertexArray(vao)

  const posBuffer = gl.createBuffer()!
  const colorBuffer = gl.createBuffer()!

  const uView = gl.getUniformLocation(program, 'u_view')
  const uProj = gl.getUniformLocation(program, 'u_proj')
  const projMatrix = mat4.create()

  // 交互事件
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
  window.addEventListener('mouseup', () => { dragging = false })
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    camera.zoom(e.deltaY > 0 ? 0.1 : -0.1)
  }, { passive: false })

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
  gl.depthMask(false)

  function render() {
    mat4.perspective(projMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100)

    const viewMatrix = camera.getViewMatrix()
    const count = positions.length / 3

    // Compute zView per point
    const sortable = []
    for (let i = 0; i < count; ++i) {
      const pos = vec4.fromValues(
        positions[i * 3 + 0],
        positions[i * 3 + 1],
        positions[i * 3 + 2],
        1.0
      )
      vec4.transformMat4(pos, pos, viewMatrix)
      sortable.push({
        z: pos[2], // view space z
        index: i
      })
    }
    sortable.sort((a, b) => a.z - b.z) // near to far

    const sortedPos = new Float32Array(positions.length)
    const sortedColor = new Uint8Array(colors.length)
    for (let i = 0; i < count; ++i) {
      const j = sortable[i].index
      sortedPos.set(positions.subarray(j * 3, j * 3 + 3), i * 3)
      sortedColor.set(colors.subarray(j * 3, j * 3 + 3), i * 3)
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, sortedPos, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(0)

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, sortedColor, gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(1, 3, gl.UNSIGNED_BYTE, true, 0, 0)
    gl.enableVertexAttribArray(1)

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.useProgram(program)
    gl.bindVertexArray(vao)
    gl.uniformMatrix4fv(uView, false, viewMatrix)
    gl.uniformMatrix4fv(uProj, false, projMatrix)
    gl.drawArrays(gl.POINTS, 0, count)
    gl.bindVertexArray(null)

    requestAnimationFrame(render)
  }

  requestAnimationFrame(render)
}
