export interface MenuConfig {
    label: string
    path: string
    key: string
    children?: MenuConfig[]
}