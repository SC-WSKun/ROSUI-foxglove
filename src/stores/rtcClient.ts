import P2PSocket from '@/utils/p2psocket'
import { defineStore } from 'pinia'

interface RtcClientStoreState {
  pc: RTCPeerConnection | null
  socket: WebSocket | null
  p2pSocket: P2PSocket | null
  streamListener: ((stream: MediaStream) => void) | null
  stream: MediaStream | null
}

export const useRtcClientStore = defineStore('rtcClient', () => {
  const state: RtcClientStoreState = {
    pc: null,
    socket: null,
    p2pSocket: null,
    streamListener: null,
    stream: null
  }

  function initRtcClient(robotId: string): Promise<P2PSocket> {
    return new Promise((resolve, reject) => {
      // 与信令服务器进行连接
      state.socket = new WebSocket(
        `ws://222.201.144.170:8020/robot_webrtc/${robotId}/signaling`
      )
      state.socket.onopen = () => sendMsg('rtc_setup', '')
      state.socket.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        switch (msg.msg_type) {
          case 'rtc_setup':
            const { stun, turn } = JSON.parse(msg.msg_body)
            state.pc = new RTCPeerConnection({
              iceServers: [
                {
                  urls: [stun]
                },
                turn
              ]
            })
            // 向远端同步ice候选信息
            state.pc.onicecandidate = (event) => {
              if (event.candidate) {
                sendMsg('ice', JSON.stringify(event.candidate))
              }
            }
            state.pc.addTransceiver('video', { direction: 'recvonly' })
            state.pc.ontrack = (event: RTCTrackEvent) => {
              console.log('track', event)
              state.stream = event.streams[0]
              // if (state.streamListener) state.streamListener(event.streams[0])
            }
            const dataChannel = state.pc.createDataChannel(
              'foxglove.websocket.v1'
            )
            dataChannel.binaryType = 'arraybuffer'
            dataChannel.onopen = () => {
              // 自定义类包装dataChannel，用于创建foxgloveClient
              state.p2pSocket = new P2PSocket(dataChannel)
              resolve(state.p2pSocket)
            }
            dataChannel.onerror = (err) => {
              console.error(err)
            }
            state.pc
              .createOffer()
              .then((desc: RTCSessionDescriptionInit) => {
                // 保存本地sdp信息
                return state.pc?.setLocalDescription(desc)
              })
              .then(() =>
                sendMsg('sdp', JSON.stringify(state.pc?.localDescription))
              )
            break
          case 'sdp':
            // 同步远端sdp信息
            state.pc
              ?.setRemoteDescription(
                new RTCSessionDescription(JSON.parse(msg.msg_body))
              )
              .catch((err) => console.log(err))
            break
          case 'ice':
            // 同步远端ice候选信息
            state.pc
              ?.addIceCandidate(new RTCIceCandidate(JSON.parse(msg.msg_body)))
              .catch((err) => console.log(err))
            break
          default:
            break
        }
      }
      state.socket.onerror = (err) => {
        console.log(err)
      }
    })
  }

  function closeRtcClient(): void {
    if (state.socket) {
      state.socket.close()
    }
    if (state.pc) {
      state.pc.close()
    }
    if (state.p2pSocket) {
      state.p2pSocket.close()
    }
    state.socket = null
    state.pc = null
    state.p2pSocket = null
  }

  // function addStreamListener(listener: (stream: MediaStream) => void) {
  //   state.streamListener = listener
  // }

  // function removeStreamListener() {
  //   state.streamListener = null
  // }

  function getStream() {
    return state.stream
  }

  function sendMsg(msg_type: string, msg_body: string) {
    if (state.socket) {
      const msg = JSON.stringify({
        msg_type,
        msg_body
      })
      state.socket.send(msg)
    }
  }

  return {
    initRtcClient,
    closeRtcClient,
    getStream
  }
})
