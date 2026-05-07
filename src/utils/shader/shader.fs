#version 300 es
precision highp float;

in mat2 v_cov2D;
in float v_opacity;
in vec3 v_viewDir;
in vec3 v_sh[9];
in vec3 v_color;
in float v_halfSize;

out vec4 outColor;

// 球谐光照计算（优化版）
vec3 evaluateSH(vec3 dir) {
    vec3 n = normalize(dir);
    float x = n.x, y = n.y, z = n.z;

    float basis[9];
    basis[0] = 0.488603 * y;           // Y1-1
    basis[1] = 0.488603 * z;           // Y10
    basis[2] = 0.488603 * x;           // Y11
    basis[3] = 1.092548 * x * y;       // Y2-2
    basis[4] = 1.092548 * y * z;       // Y2-1
    basis[5] = 0.315392 * (3.0 * z * z - 1.0); // Y20
    basis[6] = 1.092548 * x * z;       // Y21
    basis[7] = 0.546274 * (x * x - y * y); // Y22
    basis[8] = 0.0; // unused

    // 累加L1+L2 SH贡献（L0已在v_color中）
    vec3 color = vec3(0.0);
    for (int i = 0; i < 9; i++) {
        color += v_sh[i] * basis[i];
    }
    return max(color, vec3(0.0));
}

void main() {
    // 用归一化协方差求Mahalanobis距离
    mat2 invCov = inverse(v_cov2D + mat2(1e-6));
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(p, invCov * p);
    float alpha = exp(-0.5 * r2);

    vec3 color = v_color + evaluateSH(v_viewDir);
    outColor = vec4(color, alpha * v_opacity);
}