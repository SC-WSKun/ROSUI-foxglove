import P2PSocket from '@/utils/p2psocket'
import { defineStore } from 'pinia'

interface RtcClientStoreState {
  pc: RTCPeerConnection | null
  socket: WebSocket | null
  p2pSocket: P2PSocket | null
}

export const useRtcClientStore = defineStore('rtcClient', () => {
  const state: RtcClientStoreState = {
    pc: null,
    socket: null,
    p2pSocket: null
  }

  function initRtcClient(): Promise<P2PSocket> {
    return new Promise((resolve, reject) => {
      // 与信令服务器进行连接
      state.socket = new WebSocket(
        'ws://222.201.144.170:8020/robot_webrtc/robot_01/signaling'
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
            state.pc.ontrack = (event) => {}
            const dataChannel = state.pc.createDataChannel(
              'foxglove.websocket.v1'
            )
            dataChannel.binaryType = 'arraybuffer'
            dataChannel.onopen = () => {
              // 自定义类包装dataChannel，用于创建foxgloveClient
              state.p2pSocket = new P2PSocket(dataChannel)
              resolve(state.p2pSocket)
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
    closeRtcClient
  }
})
