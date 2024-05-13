export interface TableOptions {
  items: TableItem[]  // 表格columns配置
  actions?: TableAction[] // 表格操作项配置
  fetch?: () => any // 表格数据获取方法
  size?: 'small' | 'middle' | 'large' // 表格规模
  actionWidth?: number  // 操作栏宽度
  pagination?: boolean  // 是否使用分页器
}

// 表格column配置
export interface TableItem {
  title: string // column标题
  dataIndex: string // 数据索引
  key?: string  // 数据自定义索引
  dictIndex?: string  // 数据对应字典索引
  type?: string // 数据展示类型
  width?: number  // column宽度
  render?: (data: { text: any; record: any; index: number }) => string  // 自定义渲染
}

// 表格操作配置
export interface TableAction {
  text: string  // 操作名称
  type?: 'popconfirm' // 交互类型
  title?: string  // 提示标题
  danger?: boolean  // 按钮类型
  callback?: (record: any) => any // 按钮回调
  showFilter?: (record: any) => boolean // 是否展示
  disabled?: (record: any) => boolean // 是否失效
}

export interface FormOptions {
  mode?: 'simple' | 'normal'  // 表单类型
  cols?: number // 表单项列数
  items: FormItem[] // 表单项配置
  hideRequiredMark?: boolean  // 是否隐藏必填星号提示
}

// 表单项配置
export interface FormItem {
  label: string // 表单项标签
  key: string //  表单项数据索引
  type:
    | 'input' // 输入框
    | 'select'  // 选择
    | 'date'  // 日期选择
    | 'upload'  // 文件上传
    | 'checkbox'  // 勾选
    | 'radio' // 单选
    | 'switch'  // 开关
    | 'password'  // 密码
    | 'number'  // 数字
    | 'textarea'  // 文本框
    | 'dateRange' // 时间范围选择
  dictIndex?: string  // 字典索引
  placeholder?: string | string[] // 输入提示
  rules?: any[] // 校验规则
  disabled?: boolean | ((data?: any) => boolean)  // 表单项是否可编辑
  required?: boolean  // 表单项是否必填
  options?: { // 选项（类型为select时）
    label: string // 选项名
    value: any  // 选项值
  }[]
  defaultValue?: (record?: any) => any  // 默认值
  allowClear?: boolean  // 是否支持一键清空
  numberOptions?: { // 数字配置项
    max: number // 数字最大值
    min: number // 数字最小值
    precision: number // 数字精度
  }
}



export interface ModalOptions {
  title: string // 弹窗标题
  type: 'form' | 'custom' | 'normal' | 'table'  // 弹窗类型
  confirmText?: string  // 确认按钮文字
  showCancel?: boolean  // 是否展示取消按钮
  formOptions?: FormOptions // 表单配置项（弹窗类型为form）
  tableOptions?: TableOptions // 表格配置项（弹窗类型为tabel）
  dataSource?: any  // 数据源
  props?: any // 额外参数
  component?: any // 自定义组件（弹窗类型为custom）
  callback?: (...args: any[]) => any  // 弹窗确认回调
  doneMsg?: string  // 确认回调成功提示
  width?: number | string // 弹窗宽度
  showFooter?: boolean  // 是否展示弹窗底部按钮
  showMsg?: boolean // 是否展示确认回调成功提示
  content?: string  // 弹窗提示内容（弹窗类型为normal）
  onCancel?: () => any  // 弹窗取消回调
}
