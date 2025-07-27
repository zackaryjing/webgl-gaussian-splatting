import { OrbitCamera } from './orbitCamera'
import { mat4 } from 'gl-matrix'

export function renderPointCloud(
  canvas: HTMLCanvasElement,
  positions: Float32Array,
  colors: Uint8Array,
) {
  const gl = canvas.getContext('webgl2')
  if (!gl) throw new Error('WebGL2 not supported')

  const vsSource = `#version 300 es
    precision mediump float;
    layout(location = 0) in vec3 a_position;
    layout(location = 1) in vec3 a_color;
    out vec3 v_color;
    void main() {
      gl_PointSize = 2.0;
      gl_Position = vec4(a_position, 1.0);
      v_color = a_color;
    }
  `

  const fsSource = `#version 300 es
    precision mediump float;
    in vec3 v_color;
    out vec4 outColor;
    void main() {
      outColor = vec4(v_color, 1.0);
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
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(0)

  const colorBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)
  gl.vertexAttribPointer(1, 3, gl.UNSIGNED_BYTE, true, 0, 0) // true: 归一化
  gl.enableVertexAttribArray(1)

  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0, 0, 0, 1)
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.drawArrays(gl.POINTS, 0, positions.length / 3)

  gl.bindVertexArray(null)
}



export function createPointRenderer(
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
      gl_PointSize = 2.0;
      gl_Position = u_proj * u_view * vec4(a_position, 1.0);
      v_color = a_color;
    }
  `

  const fsSource = `#version 300 es
    precision mediump float;
    in vec3 v_color;
    out vec4 outColor;
    void main() {
      outColor = vec4(v_color, 1.0);
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
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
  gl.enableVertexAttribArray(0)

  const colorBuffer = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW)
  gl.vertexAttribPointer(1, 3, gl.UNSIGNED_BYTE, true, 0, 0)
  gl.enableVertexAttribArray(1)

  gl.bindVertexArray(null)

  const uView = gl.getUniformLocation(program, 'u_view')
  const uProj = gl.getUniformLocation(program, 'u_proj')
  const projMatrix = mat4.create()

  // 交互事件
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
  window.addEventListener('mouseup', () => {
    dragging = false
  })
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      camera.zoom(e.deltaY > 0 ? 0.1 : -0.1)
    },
    { passive: false },
  )

  function render() {
    mat4.perspective(projMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100)

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.useProgram(program)
    gl.bindVertexArray(vao)

    gl.uniformMatrix4fv(uView, false, camera.getViewMatrix())
    gl.uniformMatrix4fv(uProj, false, projMatrix)

    gl.drawArrays(gl.POINTS, 0, positions.length / 3)

    gl.bindVertexArray(null)

    requestAnimationFrame(render)
  }

  requestAnimationFrame(render)
}
