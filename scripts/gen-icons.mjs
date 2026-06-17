/**
 * Generates PWA icons (no dependencies) into public/. Draws the FocusClock
 * clock glyph in the Waybill blue palette and encodes PNGs via Node's zlib.
 * Run: npm run gen-icons
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const tb = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0)
  return Buffer.concat([len, tb, data, crc])
}
function encodePng(rgba, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    rgba.subarray(y * stride, y * stride + stride).forEach((v, i) => {
      raw[y * (stride + 1) + 1 + i] = v
    })
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

function draw(size, maskable) {
  const buf = new Uint8Array(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const s = size / 256
  const set = (x, y, r, g, b, a) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    const aa = a / 255
    buf[i] = Math.round(r * aa + buf[i] * (1 - aa))
    buf[i + 1] = Math.round(g * aa + buf[i + 1] * (1 - aa))
    buf[i + 2] = Math.round(b * aa + buf[i + 2] * (1 - aa))
    buf[i + 3] = Math.max(buf[i + 3], Math.round(a))
  }

  const margin = maskable ? 0 : 16 * s
  const radius = maskable ? 0 : 56 * s
  const inRounded = (x, y) => {
    const minX = margin
    const minY = margin
    const maxX = size - margin
    const maxY = size - margin
    if (x < minX || y < minY || x > maxX || y > maxY) return false
    if (radius <= 0) return true
    const rx = Math.min(x - minX, maxX - x)
    const ry = Math.min(y - minY, maxY - y)
    if (rx >= radius || ry >= radius) return true
    const dx = radius - rx
    const dy = radius - ry
    return dx * dx + dy * dy <= radius * radius
  }

  // Blue gradient background.
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (!inRounded(x, y)) continue
      const t = y / size
      set(x, y, Math.round(42 + (24 - 42) * t), Math.round(67 + (40 - 67) * t), Math.round(232 + (200 - 232) * t), 255)
    }

  // White clock face (smaller on maskable for the safe zone).
  const faceR = (maskable ? 64 : 78) * s
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy)
      if (d <= faceR) set(x, y, 248, 250, 252, d > faceR - 2 ? (255 * (faceR - d)) / 2 : 255)
    }

  // Ticks.
  for (let k = 0; k < 12; k++) {
    const ang = (k / 12) * Math.PI * 2 - Math.PI / 2
    for (let r = faceR - 12 * s; r <= faceR - 4 * s; r += 0.5)
      set(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), 100, 116, 139, 255)
  }

  // Hands.
  const hand = (deg, len, th, col) => {
    const ang = (deg * Math.PI) / 180 - Math.PI / 2
    for (let r = 0; r <= len; r += 0.5)
      for (let w = -th; w <= th; w += 0.5)
        set(Math.round(cx + Math.cos(ang) * r - Math.sin(ang) * w), Math.round(cy + Math.sin(ang) * r + Math.cos(ang) * w), col[0], col[1], col[2], 255)
  }
  const scale = maskable ? 0.82 : 1
  hand(300, 44 * s * scale, 3.4 * s, [30, 50, 200])
  hand(60, 60 * s * scale, 2.6 * s, [190, 234, 30])

  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) if (Math.hypot(x - cx, y - cy) <= 6 * s) set(x, y, 20, 40, 150, 255)

  return buf
}

mkdirSync(publicDir, { recursive: true })
writeFileSync(join(publicDir, 'icon-192.png'), encodePng(draw(192, false), 192))
writeFileSync(join(publicDir, 'icon-512.png'), encodePng(draw(512, false), 512))
writeFileSync(join(publicDir, 'icon-512-maskable.png'), encodePng(draw(512, true), 512))
writeFileSync(join(publicDir, 'apple-touch-icon.png'), encodePng(draw(180, false), 180))
console.log('[gen-icons] wrote icon-192, icon-512, icon-512-maskable, apple-touch-icon to public/')
