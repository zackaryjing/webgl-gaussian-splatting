// src/utils/orbitCamera.ts
import { vec3, mat4, quat } from 'gl-matrix'

export class OrbitCamera {
  target = vec3.fromValues(0, 0, 0)   // 观察目标点
  distance = 5                      // 摄像机距离目标点距离
  pitch = 0                        // 上下旋转（绕相机右轴），单位弧度
  yaw = 0                          // 左右旋转（绕世界Y轴），单位弧度
  minPitch = -Math.PI / 2 + 0.01   // 避免翻转
  maxPitch = Math.PI / 2 - 0.01

  position = vec3.create()
  viewMatrix = mat4.create()

  constructor() {
    this.updatePosition()
  }

  // 鼠标移动，dx, dy为像素差（建议传入适当缩放的值）
  rotate(dx: number, dy: number) {
    const sensitivity = 0.005
    this.yaw -= dx * sensitivity          // 鼠标右移，视角左转
    this.pitch -= dy * sensitivity       // 鼠标上移，视角向上看
    this.pitch = Math.min(this.maxPitch, Math.max(this.minPitch, this.pitch))
    this.updatePosition()
  }

  // 滚轮缩放
  zoom(delta: number) {
    const zoomSpeed = 0.8
    this.distance *= 1 + delta * zoomSpeed
    this.distance = Math.max(0.1, Math.min(100, this.distance))
    this.updatePosition()
  }

  updatePosition() {
    // 计算摄像机在目标点的相对位置
    const rotYaw = quat.create()
    quat.setAxisAngle(rotYaw, [0,1,0], this.yaw)

    const rotPitch = quat.create()
    quat.setAxisAngle(rotPitch, [1,0,0], this.pitch)

    const rotation = quat.create()
    quat.multiply(rotation, rotYaw, rotPitch)

    // 初始摄像机向后单位向量
    const offset = vec3.fromValues(0, 0, this.distance)
    vec3.transformQuat(offset, offset, rotation)

    // 摄像机世界位置 = 目标点 + offset
    vec3.add(this.position, this.target, offset)

    // 计算视图矩阵（lookAt）
    mat4.lookAt(this.viewMatrix, this.position, this.target, [0,1,0])
  }

  getViewMatrix() {
    return this.viewMatrix
  }
}
