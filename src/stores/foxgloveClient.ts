import { defineStore } from 'pinia'
import { message } from 'ant-design-vue'
import {
  FoxgloveClient,
  type Channel,
  type ClientChannelWithoutId,
  type Service,
  type ServerInfo
} from '@foxglove/ws-protocol'
import { MessageReader, MessageWriter } from '@foxglove/rosmsg2-serialization'
import _ from 'lodash'
import { parse as parseMessageDefinition } from '@foxglove/rosmsg'
import type P2PSocket from '@/utils/p2psocket'
import { useGlobalStore } from './global'

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

  /**
   * init the client & storage channels and services
   * @param socket
   */
  function initClient(socket: P2PSocket) {
    state.client = new FoxgloveClient({
      ws: socket
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
      console.log('services', services)
      state.services.push(...services)
      if (state.services.length === 0 && services.length === 0) {
        message.error('获取服务列表失败，请刷新重试');
      } else message.success('获取服务列表成功');
    })
    state.client.on('open', () => {
      message.success('Connected successfully!')
    })
    state.client.on('error', (e) => {
      console.error(e)
    })
    state.client.on('close', () => {
      const gloablStore = useGlobalStore()
      gloablStore.setConnected(false)
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
      return Promise.reject('Channel not found! Please try again later')
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
      message.error('未识别到连接，请先连接机器人')
      return
    }
    const channel = _.find(state.advertisedChannels, { id: channelId })
    if (!channel) {
      message.error('未发布相关话题，请稍后再试')
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
      message.error('未识别到连接，请先连接机器人')
      return Promise.reject('Client not initialized!')
    }
    const srv: Service | undefined = _.find(state.services, { name: srvName })
    console.log(state.services);
    
    if (!srv) {
      message.error('未找到相关服务，请稍后再试')
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
        try {
          const parseResDefinitions = parseMessageDefinition(
            srv?.responseSchema!,
            {
              ros2: true
            }
          )
          const reader = new MessageReader(parseResDefinitions)
          const res = reader.readMessage(response.data)
          resolve(res)
          state.client?.off('serviceCallResponse', serviceResponseHandler)
        } catch (err) {
          console.error(err);
        }
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
      message.error('未识别到连接，请先连接机器人')
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
      message.error('未识别到连接，请先连接机器人')
      return
    }
    state.client.on('message', callback)
  }

  /**
   * remove the listener of channel's message
   * @param callback
   * @returns
   */
  function stopListenMessage(callback: (...args: any) => void) {
    if (!state.client) {
      return
    }
    state.client.off('message', callback)
  }

  /**
   * transform message from channel
   * @param subId id of the subscription
   * @param data message from channel
   * @returns
   */
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
      message.error('未找到相关订阅，请稍后再试')
    }
  }

  return {
    initClient,
    closeClient,
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
