import type { IWebSocket } from '@foxglove/ws-protocol'

// This is a simple wrapper around RTCDataChannel to make it easier to use with the @foxglove/ws-protocol.
export default class P2PSocket implements IWebSocket {
  dataChannel: RTCDataChannel
  binaryData: Uint8Array = new Uint8Array()
  jsonData: string = ''
  binaryType: string
  protocol: string

  constructor(dataChannel: RTCDataChannel) {
    this.dataChannel = dataChannel
    this.binaryType = dataChannel.binaryType
    this.protocol = dataChannel.protocol
    this.dataChannel.addEventListener(
      'message',
      async (event: MessageEvent) => {
        const data = event.data
        if (data instanceof ArrayBuffer) {
          const byteArray = new Uint8Array(data)
          const packType = byteArray[0]
          const newData = new Uint8Array(data.slice(1))
          // 未压缩数据，不分包，直接上传
          if (packType === 3) {
            this.onmessage({ data: newData.buffer })
            return
          }
          this.binaryData = this.concatUint8Arrays(this.binaryData, newData)
          // 压缩数据，且最后一包，解压后上传
          if (packType === 2) {
            const decompressedStream = new Blob([this.binaryData])
              .stream()
              .pipeThrough(new DecompressionStream('gzip'))
            this.binaryData = new Uint8Array()
            const decompressedData = await this.streamToUint8Array(
              decompressedStream
            )
            this.onmessage({ data: decompressedData.buffer })
          }
        } else if (typeof data === 'string') {
          if (data.endsWith('}')) {
            this.jsonData += data
            this.onmessage({ data: this.jsonData })
            this.jsonData = ''
          } else {
            this.jsonData += data
          }
        }
      }
    )
    this.dataChannel.addEventListener('open', (event: Event) => {
      this.onopen(event)
    })

    this.dataChannel.addEventListener('error', (error: Event) => {
      console.log('datachannel', error)

      this.onerror(error)
    })

    this.dataChannel.addEventListener('close', (event: Event) => {
      console.log('datachannel', event)

      this.onclose(event)
    })
  }

  onerror(error: any) {}

  onopen(event: any) {}

  onmessage(event: any) {}

  onclose(event: any) {}

  close() {
    this.dataChannel.close()
  }

  send(data: string) {
    this.dataChannel.send(data)
  }

  private concatUint8Arrays(buffer1: Uint8Array, buffer2: Uint8Array) {
    let newArray = new Uint8Array(buffer1.length + buffer2.length)
    newArray.set(buffer1, 0)
    newArray.set(buffer2, buffer1.length)
    return newArray
  }

  private async streamToUint8Array(
    stream: ReadableStream
  ): Promise<Uint8Array> {
    const chunks = []
    const reader = stream.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      chunks.push(value)
    }
    const concatenated = new Blob(chunks).arrayBuffer()
    return new Uint8Array(await concatenated)
  }
}
