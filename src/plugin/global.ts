import { defineAsyncComponent, type App } from 'vue'
import {
  Button,
  message,
  Menu,
  Table,
  Pagination,
  Modal,
  Popconfirm,
  Row,
  Col,
  Form,
  Input,
  Select,
  Upload,
  Radio,
  Checkbox,
  Switch,
  InputNumber,
  Steps,
  DatePicker,
  Spin,
  Dropdown,
  Card,
  Empty,
  Tabs,
  ConfigProvider
} from 'ant-design-vue'
import JoyStick from '@/components/JoyStick.vue'

export default {
  install(app: App) {
    app.config.globalProperties.$message = message

    app.use(Button)
    app.use(Menu)
    app.use(Table)
    app.use(Pagination)
    app.use(Modal)
    app.use(Popconfirm)
    app.use(Row)
    app.use(Col)
    app.use(Form)
    app.use(Input)
    app.use(Select)
    app.use(Upload)
    app.use(Radio)
    app.use(Checkbox)
    app.use(Switch)
    app.use(InputNumber)
    app.use(Steps)
    app.use(DatePicker)
    app.use(Spin)
    app.use(Dropdown)
    app.use(Card)
    app.use(Empty)
    app.use(Tabs)
    app.use(ConfigProvider)

    app.component('JoyStick', JoyStick)

    const components = import.meta.glob('@/base/*.vue')
    for (const [key, value] of Object.entries(components)) {
      const name = key.slice(key.lastIndexOf('/') + 1, key.lastIndexOf('.'))
      app.component(name, defineAsyncComponent(value as any))
    }

    const customIcons = import.meta.glob('@/icons/*.vue')
    for (const [key, value] of Object.entries(customIcons)) {
      const name = key.slice(key.lastIndexOf('/') + 1, key.lastIndexOf('.'))
      app.component(name, defineAsyncComponent(value as any))
    }
  }
}
