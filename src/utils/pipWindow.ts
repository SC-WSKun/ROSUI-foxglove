import { useRtcClientStore } from "@/stores/rtcClient";
import nipplejs from 'nipplejs';

interface JoyStickState {
  manager: nipplejs.JoystickManager | null
  linearSpeed: number
  angularSpeed: number
  timer: any
  subId: number | undefined
  channelId: number | undefined
  topicName: MoveTopic | undefined
  stickActive: boolean
}

enum MoveTopic {
  cmd_vel_teleop = '/cmd_vel_teleop',
  cmd_vel = '/cmd_vel',
}

const JoyStickConst = {
  MAX_LINEAR: 15.0, // m/s
  MAX_ANGULAR: 20.0, // rad/s
  MAX_DISTANCE: 75.0, // pixels
}

export class JoyStick {
  state: JoyStickState = {
    manager: null,
    linearSpeed: 0,
    angularSpeed: 0,
    timer: undefined,
    subId: -1,
    channelId: -1,
    topicName: undefined,
    stickActive: false,
  };
  nippleOptions: nipplejs.JoystickManagerOptions = {};
  
  constructor(el: HTMLElement, pipDoc: Document) {
    const joyStickEl = document.createElement('div');
    joyStickEl.id = 'nippleZone';
    joyStickEl.style.position = 'relative';
    document.querySelector('#videoContainer')?.appendChild(joyStickEl);
    // el.appendChild(joyStickEl);
    this.nippleOptions = {
      color: '#5964f8',
      mode: 'static',
      position: {
        top: '300px',
        left: '120px'
      },
      size: 150,
      threshold: 0.1,
      zone: joyStickEl,
    };
    this.state.manager = nipplejs.create(this.nippleOptions);
    // 摇杆控制
    this.state.manager.on('start', () => {
      this.state.stickActive = true;
      console.log('start');
      this.state.timer = setInterval(
        () => {
          this.handleMove(this.state.linearSpeed, this.state.angularSpeed)
        },
        25
      );
    });
    this.state.manager.on('end', () => this.handleJoystickPause())
    this.state.manager.on('move', (event, nipple) => {
      this.state.linearSpeed =
        (Math.sin(nipple.angle.radian) * JoyStickConst.MAX_LINEAR) / JoyStickConst.MAX_DISTANCE;
      this.state.angularSpeed =
        (-Math.cos(nipple.angle.radian) * JoyStickConst.MAX_ANGULAR) / JoyStickConst.MAX_DISTANCE;
      console.log('move', event, this.state.linearSpeed, this.state.angularSpeed);
    });

    // 键盘控制
    pipDoc.addEventListener('keydown', this.handleKeydown);
    pipDoc.addEventListener('keyup', this.handleKeyup);
  }

  handleMove(linearSpeed: number, angularSpeed: number) {
    console.log('handleMove', linearSpeed, angularSpeed);
  }

  // 摇杆blur事件
  handleJoystickPause = () => {
    clearInterval(this.state.timer);
    this.state.timer = undefined;
    this.handleMove(0, 0);
    this.state.linearSpeed = 0;
    this.state.angularSpeed = 0;
    this.state.stickActive = false;
  }

  // 键盘监听事件
  handleKeydown = (event: KeyboardEvent) => {
    if (this.state.stickActive) {
      this.handleJoystickPause()
    }
    switch (event.key) {
      case 'ArrowUp':
        this.state.linearSpeed = JoyStickConst.MAX_LINEAR / JoyStickConst.MAX_DISTANCE;
        break
      case 'ArrowDown':
        this.state.linearSpeed = -JoyStickConst.MAX_LINEAR / JoyStickConst.MAX_DISTANCE;
        break
      case 'ArrowLeft':
        this.state.angularSpeed =
          (JoyStickConst.MAX_ANGULAR / JoyStickConst.MAX_DISTANCE) * (this.state.linearSpeed >= 0 ? 1 : -1);
        break
      case 'ArrowRight':
        this.state.angularSpeed =
          (-JoyStickConst.MAX_ANGULAR / JoyStickConst.MAX_DISTANCE) * (this.state.linearSpeed >= 0 ? 1 : -1);
        break
      default:
        break
    }
    this.handleMove(this.state.linearSpeed, this.state.angularSpeed);
  }

  // 键盘松开事件
  handleKeyup = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        this.state.linearSpeed = 0
        break
      case 'ArrowLeft':
      case 'ArrowRight':
        this.state.angularSpeed = 0
        break
      default:
        break
    }
    this.handleMove(this.state.linearSpeed, this.state.angularSpeed)
  }
}

export class PipWindow {
  el: HTMLElement | null = null;
  fullSupport: boolean = false;
  rtcClientStore = useRtcClientStore();
  videoEl: HTMLVideoElement | null = null;
  joyStick: JoyStick | null = null;

  public async init() {
    this.fullSupport = false;
    // 不支持文档画中画则 视频画中画即可
    if (!('documentPictureInPicture' in window)) {
      return;
    }
    if (this.el) return;
    const el = document.createElement('div');
    this.el = el;
    this.el.id = 'pipWindow';
    this.el.style.width = '100%';
    this.el.style.height = '100vh';
    
    // this.initLiveVideo(this.el);

    this.fullSupport = true;
    // @ts-ignore
    const pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 400,  // 设置窗口的宽度
      height: 400  // 设置窗口的高度
    });
    pipWindow.document.body.appendChild(this.el);
    setTimeout(() => {
      this.joyStick = new JoyStick(el, pipWindow.document);
    }, 2000);
  }

  initLiveVideo(el: HTMLElement) {
    const video = document.createElement('video');
    video.id = 'video';
    video.srcObject = this.rtcClientStore.getStream();
    video.autoplay = true;
    this.videoEl = video;
    el.appendChild(video);
  }
}

let instance: PipWindow | null = null;
export function getPipWindow() {
  if (!instance) instance = new PipWindow();
  return instance;
}