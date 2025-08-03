#version 300 es
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
    v_viewDir = -posView;// 从点指向摄像机
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
    vec3(J[0][0], J[1][0], J[2][0]), // 取J的三列的第0个分量
    vec3(J[0][1], J[1][1], J[2][1])// 取J的三列的第1个分量
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

    float m00 = dot(temp_row0, vec3(J2[0][0], J2[1][0], 0));// J2第一列（列索引0）
    float m01 = dot(temp_row0, vec3(J2[0][1], J2[1][1], 0));// J2第二列（列索引1）
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
    gl_PointSize = clamp(size * 2.0, 2.0, 100.0);
    // gl_PointSize = 2.0;
}