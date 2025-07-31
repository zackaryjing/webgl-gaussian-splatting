import { OrbitCamera } from './orbitCamera'
import { mat4, vec3, quat } from 'gl-matrix'
import { type Gaussian } from '@/utils/parsePly.ts'

export function createGaussianRenderer(canvas: HTMLCanvasElement, gaussians: Gaussian[]) {
  const gl = canvas.getContext('webgl2')!
  const camera = new OrbitCamera()

  const vsSource = `#version 300 es
    precision highp float;

    layout(location = 0) in vec3 a_position;
    layout(location = 1) in float a_opacity;
    layout(location = 2) in vec3 a_scale;
    layout(location = 3) in vec4 a_quat;

    // 9 个 SH 系数，分成3个 vec3 输入
    layout(location = 4) in vec3 a_dc;
    layout(location = 5) in vec3 a_sh0;
    layout(location = 6) in vec3 a_sh1;
    layout(location = 7) in vec3 a_sh2;
    layout(location = 8) in vec3 a_sh3;
    layout(location = 9) in vec3 a_sh4;
    layout(location = 10) in vec3 a_sh5;
    layout(location = 11) in vec3 a_sh6;
    layout(location = 12) in vec3 a_sh7;
    layout(location = 13) in vec3 a_sh8;

    uniform mat4 u_view;
    uniform mat4 u_proj;
    uniform vec2 u_canvasSize;

    out float v_opacity;
    out mat2 v_cov2D;
    out vec3 v_sh[9];
    out vec4 v_viewDir;
    out vec3 v_color;


    mat3 quatToMat3(vec4 q) {
      float x = q.x, y = q.y, z = q.z, w = q.w;
      return mat3(
        1.0 - 2.0*y*y - 2.0*z*z, 2.0*x*y - 2.0*z*w,     2.0*x*z + 2.0*y*w,
        2.0*x*y + 2.0*z*w,     1.0 - 2.0*x*x - 2.0*z*z, 2.0*y*z - 2.0*x*w,
        2.0*x*z - 2.0*y*w,     2.0*y*z + 2.0*x*w,     1.0 - 2.0*x*x - 2.0*y*y
      );
    }

    void main() {
      vec4 posView = u_view * vec4(a_position, 1.0);
      v_viewDir = -posView; // 从点指向摄像机
      gl_Position = u_proj * posView;

      mat3 R = quatToMat3(a_quat);
      mat3 S = mat3(
        a_scale.x * a_scale.x, 0, 0,
        0, a_scale.y * a_scale.y, 0,
        0, 0, a_scale.z * a_scale.z
      );
      mat3 Sigma3D = R * S * transpose(R);

      mat3 J = mat3(u_view);
      // 构造2x3矩阵
      mat2x3 J2 = mat2x3(
        vec3(J[0][0], J[1][0], J[2][0]),  // 取J的三列的第0个分量
        vec3(J[0][1], J[1][1], J[2][1])   // 取J的三列的第1个分量
      );

      // J2 * Sigma3D
      vec3 temp_row0 = vec3(
        dot(J2[0], Sigma3D[0]),
        dot(J2[0], Sigma3D[1]),
        dot(J2[0], Sigma3D[2])
      );
      vec3 temp_row1 = vec3(
        dot(J2[1], Sigma3D[0]),
        dot(J2[1], Sigma3D[1]),
        dot(J2[1], Sigma3D[2])
      );

      // temp 是 mat2x3，行向量是 temp_row0 和 temp_row1

      // transpose(J2) 是 3x2，列向量是 J2[0] 和 J2[1] 但转置后变成了 3 列 2 行
      // 所以计算 cov2D = temp * transpose(J2)

      float m00 = dot(temp_row0, vec3(J2[0][0], J2[1][0], 0)); // J2第一列（列索引0）
      float m01 = dot(temp_row0, vec3(J2[0][1], J2[1][1], 0)); // J2第二列（列索引1）
      float m10 = dot(temp_row1, vec3(J2[0][0], J2[1][0], 0));
      float m11 = dot(temp_row1, vec3(J2[0][1], J2[1][1], 0));

      mat2 cov2D = mat2(
        m00, m01,
        m10, m11
      );

      float scaleX = u_canvasSize.x * 0.5;
      float scaleY = u_canvasSize.y * 0.5;
      mat2 pixelCov = mat2(
        cov2D[0][0] * scaleX * scaleX, cov2D[0][1] * scaleX * scaleY,
        cov2D[1][0] * scaleX * scaleY, cov2D[1][1] * scaleY * scaleY
      );

      v_cov2D = pixelCov;
      v_opacity = a_opacity;
      v_color = a_dc;

      // 赋值9个SH系数到输出数组
      v_sh[0] = a_sh0;
      v_sh[1] = a_sh1;
      v_sh[2] = a_sh2;
      v_sh[3] = a_sh3;
      v_sh[4] = a_sh4;
      v_sh[5] = a_sh5;
      v_sh[6] = a_sh6;
      v_sh[7] = a_sh7;
      v_sh[8] = a_sh8;

      float size = sqrt(max(pixelCov[0][0] + pixelCov[1][1], 1.0));
      gl_PointSize = clamp(size * 2.0, 2.0, 100.0) ;
      // gl_PointSize = 2.0;
  }`

  const fsSource = `#version 300 es
    precision highp float;

    in mat2 v_cov2D;
    in float v_opacity;
    in vec4 v_viewDir;
    in vec3 v_sh[9];
    in vec3 v_color;

    out vec4 outColor;

    // Evaluate spherical harmonics lighting given view direction
    vec3 evaluateSH(vec4 viewDir) {
      float x = viewDir.x;
      float y = viewDir.y;
      float z = viewDir.z;

      float shBasis[9];
      shBasis[0] = 0.282095;            // Y00
      shBasis[1] = 0.488603 * y;        // Y1-1
      shBasis[2] = 0.488603 * z;        // Y10
      shBasis[3] = 0.488603 * x;        // Y11
      shBasis[4] = 1.092548 * x * y;    // Y2-2
      shBasis[5] = 1.092548 * y * z;    // Y2-1
      shBasis[6] = 0.315392 * (3.0 * z * z - 1.0); // Y20
      shBasis[7] = 1.092548 * x * z;    // Y21
      shBasis[8] = 0.546274 * (x * x - y * y); // Y22

      vec3 color = vec3(0.0);
      for (int i = 0; i < 9; i++) {
        color += v_sh[i] * shBasis[i];
      }
      return color;
    }


    void main() {
      // Point sprite coord in [-1, 1]
      vec2 p = gl_PointCoord * 2.0 - 1.0;

      // Gaussian alpha from 2D projected covariance matrix
      mat2 invCov = inverse(v_cov2D + 1e-6 * mat2(1.0));
      float r2 = dot(p, invCov * p);
      float alpha = exp(-1000000000.0 * r2);

      if (alpha < 1.0 / 255.0) discard; // discard if fully transparent

      vec3 lighting = evaluateSH(normalize(v_viewDir));
      vec3 finalColor = v_color * lighting;

      outColor = vec4(v_color,alpha * v_opacity);
      // outColor = vec4(finalColor, alpha * v_opacity);
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
