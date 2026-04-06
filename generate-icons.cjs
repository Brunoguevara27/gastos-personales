// Generates PNG icons with white "$" symbol on indigo background
const zlib = require('zlib')
const fs = require('fs')

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuffer = Buffer.from(type)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([len, typeBuffer, data, crcBuf])
}

// Dollar sign bitmap: 9 cols x 11 rows
const SYM = [
  [0,0,1,1,1,1,1,0,0],
  [0,1,1,1,1,1,1,1,0],
  [1,1,0,0,1,0,0,1,1],
  [1,1,0,0,1,0,0,0,0],
  [0,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,0],
  [0,0,0,0,1,0,0,1,1],
  [1,1,0,0,1,0,0,1,1],
  [0,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,0,0],
]
const SYM_ROWS = SYM.length    // 11
const SYM_COLS = SYM[0].length // 9

function createPNG(size) {
  const BG = [79, 70, 229]    // #4f46e5 indigo
  const FG = [255, 255, 255]  // white

  // Symbol occupies ~50% of icon height, keeping aspect ratio
  const symH = Math.floor(size * 0.50)
  const symW = Math.floor(symH * SYM_COLS / SYM_ROWS)
  const startX = Math.floor((size - symW) / 2)
  const startY = Math.floor((size - symH) / 2)

  // Vertical bar: runs from startY - 8% to startY + symH + 8%
  const barMargin = Math.floor(size * 0.08)
  const barTop = startY - barMargin
  const barBot = startY + symH + barMargin
  const cx = Math.floor(size / 2)
  const halfBar = Math.max(1, Math.floor(size * 0.022))

  const rows = []
  for (let y = 0; y < size; y++) {
    const row = [0] // filter byte
    for (let x = 0; x < size; x++) {
      // Check symbol grid
      let isFG = false
      const symY = Math.floor((y - startY) / symH * SYM_ROWS)
      const symX = Math.floor((x - startX) / symW * SYM_COLS)
      if (symY >= 0 && symY < SYM_ROWS && symX >= 0 && symX < SYM_COLS) {
        isFG = SYM[symY][symX] === 1
      }
      // Vertical bar through center
      if (Math.abs(x - cx) <= halfBar && y >= barTop && y <= barBot) {
        isFG = true
      }
      row.push(isFG ? FG[0] : BG[0])
      row.push(isFG ? FG[1] : BG[1])
      row.push(isFG ? FG[2] : BG[2])
    }
    rows.push(Buffer.from(row))
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit RGB

  const compressed = zlib.deflateSync(Buffer.concat(rows))

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const [name, size] of [['icon-180.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  fs.writeFileSync(`public/${name}`, createPNG(size))
  console.log(`Generated public/${name} (${size}x${size})`)
}
