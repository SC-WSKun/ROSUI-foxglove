import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useFoxgloveClientStore } from '@/stores/foxgloveClient'

import App from './App.vue'
import router from './router'

import Global from './plugin/global'
import { FoxgloveClient, type IWebSocket } from '@foxglove/ws-protocol'
import P2PSocket from './utils/p2psocket'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Global)

const foxgloveClientStore = useFoxgloveClientStore()

// const socket = new WebSocket('ws://localhost:8765', [
//   FoxgloveClient.SUPPORTED_SUBPROTOCOL
// ])
let pc: RTCPeerConnection | null = null
let dataChannel: RTCDataChannel | null = null
const socket = new WebSocket(
  'ws://222.201.144.170:8020/robot_webrtc/robot_01/signaling'
)
socket.onopen = (event) => {
  send_msg('rtc_setup', '')
}
socket.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  switch (msg.msg_type) {
    case 'rtc_setup':
      let cfg = JSON.parse(msg.msg_body)
      let servers = [
        {
          urls: [cfg.stun]
        },
        cfg.turn
      ]
      pc = new RTCPeerConnection({
        iceServers: servers
      })
      pc.ontrack = function (event) {}
      pc.oniceconnectionstatechange = (e) =>
        console.log('ice connection state change', pc?.iceConnectionState)
      pc.onicecandidate = (event) => {
        if (event.candidate === null) {
          // document.getElementById('localSessionDescription')!.value = btoa(
          //   JSON.stringify(pc.localDescription)
          // )
        } else if (event.candidate.candidate) {
          send_ice(event.candidate)
        }
      }
      dataChannel = pc.createDataChannel('foxglove.websocket.v1')
      dataChannel.binaryType = 'arraybuffer'

      dataChannel.addEventListener('open', (event) => {
        console.log('datachannel opened.')
        foxgloveClientStore.initClient(new P2PSocket(dataChannel!))
        // foxgloveClientStore.initClient(dataChannel!)
      })

      startSession()

      break

    case 'sdp':
      try {
        pc?.setRemoteDescription(
          new RTCSessionDescription(JSON.parse(msg.msg_body))
        )
      } catch (e) {
        alert(e)
      }
      break
    case 'ice':
      try {
        pc?.addIceCandidate(new RTCIceCandidate(JSON.parse(msg.msg_body)))
      } catch (e) {
        alert(e)
      }
      break

    default:
      break
  }
}

app.mount('#app')

function send_msg(msg_type: string, msg_body: string) {
  let msg = JSON.stringify({
    msg_type: msg_type,
    msg_body: msg_body
  })
  console.log(msg)
  socket.send(msg)
}

function send_ice(desc: any) {
  send_msg('ice', JSON.stringify(desc))
}

function send_sdp(desc: any) {
  send_msg('sdp', JSON.stringify(desc))
}

const startSession = () => {
  pc?.createOffer()
    .then((d) => {
      console.log(d)
      pc?.setLocalDescription(d)
      send_sdp(d)
    })
    .catch((err) => console.error(err))
}
