import type { IWebSocket } from '@foxglove/ws-protocol'

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
    this.dataChannel.addEventListener('message', (event: MessageEvent) => {
      const data = event.data
      if (data instanceof ArrayBuffer) {
        const byteArray = new Uint8Array(data)
        const packType = byteArray[0]
        const newData = new Uint8Array(data.slice(1))
        this.binaryData = this.concatUint8Arrays(this.binaryData, newData)
        if (packType === 2) {
          this.onmessage({ data: this.binaryData.buffer })
          this.binaryData = new Uint8Array()
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
      this.dataChannel.addEventListener('open', (event: Event) => {
        this.onopen(event)
      })

      this.dataChannel.addEventListener('error', (error: Event) => {
        this.onerror(error)
      })

      this.dataChannel.addEventListener('close', (event: Event) => {
        this.onclose(event)
      })
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
}
