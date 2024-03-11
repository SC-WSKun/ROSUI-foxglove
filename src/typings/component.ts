export interface TableOptions {
  items: TableItem[]
  actions?: TableAction[]
  search?: SearchOptions
  fetch?: () => any
  size?: 'small' | 'middle' | 'large'
  actionWidth?: number
  pagination?: boolean
}

export interface TableItem {
  title: string
  dataIndex: string
  key?: string
  dictIndex?: string
  type?: string
  actions?: TableAction[]
  width?: number
  render?: (data: { text: any; record: any; index: number }) => string
}

export interface TableAction {
  text: string
  type?: 'popconfirm'
  title?: string
  danger?: boolean
  callback?: (record: any) => any
  showFilter?: (record: any) => boolean
  disabled?: (record: any) => boolean
}

export interface SearchOptions extends Partial<FormOptions> {
  preHook?: (...params: any) => any
}

export interface FormItem {
  label: string
  key: string
  type:
    | 'input'
    | 'select'
    | 'date'
    | 'upload'
    | 'checkbox'
    | 'radio'
    | 'switch'
    | 'password'
    | 'number'
    | 'textarea'
    | 'dateRange'
  dictIndex?: string
  placeholder?: string | string[]
  rules?: any[]
  disabled?: boolean | ((data?: any) => boolean)
  required?: boolean
  options?: {
    label: string
    value: any
  }[]
  defaultValue?: (record?: any) => any
  uploadOptions?: UploadOptions
  allowClear?: boolean
  numberOptions?: {
    max: number
    min: number
    precision: number
  }
}

export interface FormOptions {
  mode?: 'simple' | 'normal'
  cols?: number
  items: FormItem[]
  disabled?: boolean | ((record?: any) => boolean)
  hideRequiredMark?: boolean
}

export interface ModalOptions {
  title: string
  type: 'form' | 'custom' | 'normal' | 'table'
  confirmText?: string
  showCancel?: boolean
  formOptions?: FormOptions
  tableOptions?: TableOptions
  dataSource?: any
  props?: any
  component?: any
  callback?: (...args: any[]) => any
  doneMsg?: string
  width?: number | string
  showFooter?: boolean
  showMessage?: boolean
  content?: string
  closeModal?: boolean
}

export interface UploadOptions {
  fileType: 'image/*' | 'audio/*' | 'video/*'
  multiple?: boolean
  max?: number
}

export interface Step {
  title: string
  type: 'form' | 'custom'
  component?: any
  formOptions?: FormOptions
  dataSource?: any
  props?: any
}

export interface StepOptions {
  steps: Step[]
  dataSource?: any
  callback?: (data: any) => any
}
