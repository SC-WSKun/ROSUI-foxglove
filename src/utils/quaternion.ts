export class Quaternion {
  x: number
  y: number
  z: number
  w: number

  constructor(x: number, y: number, z: number, w: number) {
    this.x = x
    this.y = y
    this.z = z
    this.w = w
  }

  // 四元数共轭
  conjugate() {
    return new Quaternion(this.w, -this.x, -this.y, -this.z)
  }

  // 四元数加法
  plus(other: Quaternion) {
    return new Quaternion(
      this.x + other.x,
      this.y + other.y,
      this.z + other.z,
      this.w + other.w
    )
  }

  // 四元数减法
  minus(other: Quaternion) {
    return new Quaternion(
      this.x - other.x,
      this.y - other.y,
      this.z - other.z,
      this.w - other.w
    )
  }

  // 四元数乘法
  multiply(other: Quaternion) {
    return new Quaternion(
      this.w * other.w - this.x * other.x - this.y * other.y - this.z * other.z,
      this.w * other.x + this.x * other.w + this.y * other.z - this.z * other.y,
      this.w * other.y - this.x * other.z + this.y * other.w + this.z * other.x,
      this.w * other.z + this.x * other.y - this.y * other.x + this.z * other.w
    )
  }
}
