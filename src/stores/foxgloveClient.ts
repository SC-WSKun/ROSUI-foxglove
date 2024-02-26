import { computed } from 'vue'
import { defineStore, type Store } from 'pinia'
import { message } from 'ant-design-vue'
import {
  FoxgloveClient,
  type Channel,
  type IWebSocket,
  type ClientChannelWithoutId,
  type Service,
  type ServerInfo
} from '@foxglove/ws-protocol'
import { MessageReader, MessageWriter } from '@foxglove/rosmsg2-serialization'
import _ from 'lodash'
import { parse as parseMessageDefinition } from '@foxglove/rosmsg'

interface Sub {
  subId: number
  channelId: number
}

interface FoxgloveClientStoreState {
  client: FoxgloveClient | null
  channels: Map<number, Channel>
  services: Service[]
  subs: Sub[]
  advertisedChannels: any[]
  msgEncoding: string
  callServiceId: number
}

export const useFoxgloveClientStore = defineStore('foxgloveClient', () => {
  const state: FoxgloveClientStoreState = {
    client: null, // foxgloveClient
    channels: new Map(), // channels advertised from server
    services: [], // services advertised from server
    subs: [], // subscribed channels
    advertisedChannels: [], // advertised channels from client
    msgEncoding: 'cdr', // message encoding
    callServiceId: 0 // service call id
  }

  const foxgloveClientConnected = computed(() => state.client !== null)

  /**
   * init the client & storage channels and services
   * @param ws
   */
  function initClient(ws: IWebSocket) {
    state.client = new FoxgloveClient({
      ws
    })
    state.client.on('advertise', (channels: Channel[]) => {
      channels.forEach((channel: Channel) => {
        state.channels.set(channel.id, channel)
      })
      console.log('current', state.channels)
    })
    state.client.on('unadvertise', (channelIds: number[]) => {
      channelIds.forEach((id: number) => {
        state.channels.delete(id)
      })
      console.log('current', state.channels)
    })
    state.client.on('advertiseServices', (services: Service[]) => {
      state.services.push(...services)
    })
    state.client.on('open', () => {
      message.success('Connected successfully!')
    })
    state.client.on('error', () => {
      message.error('Failed to connect!')
    })
    state.client.on('close', () => {
      message.warning('Connection closed!')
    })
    state.client.on('serverInfo', (serverInfo: ServerInfo) => {
      if (serverInfo.supportedEncodings) {
        state.msgEncoding = serverInfo.supportedEncodings[0]
      }
    })
  }

  /**
   * close the client
   */
  function closeClient() {
    if (state.client) {
      // unadvertise all the channel
      state.advertisedChannels.forEach((channel) => {
        state.client?.unadvertise(channel.id)
      })
      // unsubscribe all the channel from server
      state.subs.forEach((sub) => {
        state.client?.unsubscribe(sub.subId)
      })
      state.client.close()
      state.client = null
    }
    message.info('Connection closed!')
  }

  /**
   * subscribe one of the channels
   * @param topic topic's name
   * @returns id of the subscription
   */
  function subscribeTopic(topic: string) {
    if (!state.client) {
      return Promise.reject('Client not initialized')
    }
    const channel = _.find(Array.from(state.channels.values()), { topic })
    if (!channel) {
      return Promise.reject('Channel not found')
    }

    const subId = state.client.subscribe(channel.id)

    state.subs.push({
      subId,
      channelId: channel.id
    })
    return Promise.resolve(subId)
  }

  /**
   * unsubscribe topic
   * @param subId id of the subscription
   * @returns
   */
  function unSubscribeTopic(subId: number) {
    if (!state.client) {
      message.error('Client not initialized!')
      return
    }
    // remove from subs list
    state.subs = _.reject(state.subs, { subId })
    state.client.unsubscribe(subId)
  }

  /**
   * publish message with one of the channel advertised
   * @param channelId id of channels advertised
   * @param message message to publish
   * @returns
   */
  function publishMessage(channelId: number, message: any) {
    if (!state.client) {
      message.error('Client not initialized!')
      return
    }
    const channel = _.find(state.advertisedChannels, { id: channelId })
    if (!channel) {
      message.error('Channel not found!')
      return
    }

    const parseDefinitions = parseMessageDefinition(channel.schema, {
      ros2: true
    })
    const writer = new MessageWriter(parseDefinitions)
    const uint8Array = writer.writeMessage(message)
    state.client.sendMessage(channelId, uint8Array)
  }

  /**
   * call service
   * @param srvName service name
   * @param payload request params
   * @returns a promise wait for the response
   */
  function callService(
    srvName: string,
    payload: { [key: string]: any }
  ): Promise<any> {
    if (!state.client) {
      message.error('Client not initialized!')
      return Promise.reject('Client not initialized!')
    }
    const srv: Service | undefined = _.find(state.services, { name: srvName })
    if (!srv) {
      message.error('Service not found!')
      return Promise.reject('Service not found!')
    }
    const parseReqDefinitions = parseMessageDefinition(srv?.requestSchema!, {
      ros2: true
    })
    const writer = new MessageWriter(parseReqDefinitions)
    const uint8Array = writer.writeMessage(payload)
    state.client.sendServiceCallRequest({
      serviceId: srv?.id!,
      callId: ++state.callServiceId,
      encoding: state.msgEncoding,
      data: new DataView(uint8Array.buffer)
    })
    return new Promise((resolve) => {
      // 将监听回调函数抽离的目的是避免监听未及时off造成的内存泄漏
      function serviceResponseHandler(response: any) {
        const parseResDefinitions = parseMessageDefinition(
          srv?.responseSchema!,
          {
            ros2: true
          }
        )
        const reader = new MessageReader(parseResDefinitions)
        console.log('res.data', response.data)
        console.log('reader', reader);
        

        const res = reader.readMessage(response.data)
        resolve(res)
        state.client?.off('serviceCallResponse', serviceResponseHandler)
      }
      state!.client!.on('serviceCallResponse', serviceResponseHandler)
    })
  }

  /**
   * advertise topic
   * @param channel channel to be advertised
   * @returns id of the channel
   */
  function advertiseTopic(channel: ClientChannelWithoutId) {
    if (!state.client) {
      message.error('Client not initialized!')
      return
    }
    const channelId = state.client.advertise(channel)
    state.advertisedChannels.push({
      id: channelId,
      ...channel
    })
    return channelId
  }

  /**
   * unadvertise topic
   * @param channelId id of the channel to be unadvertised
   * @returns
   */
  function unAdvertiseTopic(channelId: number) {
    if (!state.client) {
      message.error('Client not initialized!')
      return
    }
    // remove from advertised channels list
    state.advertisedChannels = _.reject(state.advertisedChannels, {
      id: channelId
    })
    state.client.unadvertise(channelId)
  }

  /**
   * receive the message from subscribeb channel
   * @param subId id of the subscription
   * @param callback
   * @returns
   */
  function listenMessage(callback: (...args: any) => void) {
    if (!state.client) {
      message.error('Client not initialized!')
      return
    }
    state.client.on('message', callback)
  }

  function stopListenMessage(callback: (...args: any) => void) {
    if (!state.client) {
      message.error('Client not initialized!')
      return
    }
    state.client.off('message', callback)
  }

  function readMsgWithSubId(subId: number, data: DataView) {
    const sub = _.find(state.subs, { subId })
    if (sub) {
      const channel = state.channels.get(sub.channelId)
      const parseDefinitions = parseMessageDefinition(channel?.schema!, {
        ros2: true
      })
      const reader = new MessageReader(parseDefinitions)
      return reader.readMessage(data)
    } else {
      console.log('sub not found')
      message.error('sub not found')
    }
  }

  return {
    state,
    initClient,
    closeClient,
    foxgloveClientConnected,
    subscribeTopic,
    unSubscribeTopic,
    listenMessage,
    stopListenMessage,
    publishMessage,
    callService,
    advertiseTopic,
    unAdvertiseTopic,
    readMsgWithSubId
  }
})
