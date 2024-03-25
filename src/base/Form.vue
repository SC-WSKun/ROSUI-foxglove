<template>
  <div class="Form">
    <a-form
      :model="formFields"
      :label-col="{ span: 4 }"
      autocomplete="off"
      ref="formRef"
      :hideRequiredMark="formOptions.hideRequiredMark"
    >
      <a-row :gutter="24">
        <a-col
          :span="formOptions.cols ? 24 / formOptions.cols : 24"
          v-for="(item, index) in fieldItems"
          :key="index"
          :labelCol="{ span: 1 }"
        >
          <a-form-item
            :label="formOptions.mode === 'simple' ? '' : item.label"
            :name="item.key"
            :rules="item.rules"
            validateFirst
          >
            <template v-if="item.type === 'input' || !item.type">
              <a-input
                v-model:value="formFields[item.key]"
                :placeholder="item.placeholder || item.label"
                :disabled="item.disabled"
                :allowClear="item.allowClear"
              />
            </template>
            <template v-else-if="item.type === 'select'">
              <a-select
                v-model:value="formFields[item.key]"
                :options="item.options || []"
                :disabled="item.disabled"
                :placeholder="item.placeholder || item.label"
                :allowClear="item.allowClear"
              ></a-select>
            </template>
            <template v-else-if="item.type === 'radio'">
              <a-radio-group
                v-model:value="formFields[item.key]"
                :options="item.options || []"
              ></a-radio-group>
            </template>
            <template v-else-if="item.type === 'checkbox'">
              <a-checkbox-group
                v-model:value="formFields[item.key]"
                :options="item.options || []"
              ></a-checkbox-group>
            </template>
            <template v-else-if="item.type === 'switch'">
              <a-switch
                v-model:checked="formFields[item.key]"
                :unCheckedValue="false"
              ></a-switch>
            </template>
            <template v-else-if="item.type === 'password'">
              <a-input-password
                v-model:value="formFields[item.key]"
                :placeholder="item.placeholder || item.label"
                :disabled="item.disabled"
              />
            </template>
            <template v-else-if="item.type === 'number'">
              <a-input-number
                v-model:value="formFields[item.key]"
                :disabled="item.disabled"
                :max="item.numberOptions?.max || 100"
                :min="item.numberOptions?.min || 0"
                :precision="item.numberOptions?.precision || 0"
              ></a-input-number>
            </template>
            <template v-else-if="item.type === 'textarea'">
              <a-textarea
                v-model:value="formFields[item.key]"
                :disabled="item.disabled"
                :placeholder="item.placeholder || item.label"
              ></a-textarea>
            </template>
            <template v-else-if="item.type === 'date'">
              <a-date-picker
                v-model:value="formFields[item.key]"
                :disabled="item.disabled"
                :placeholder="item.placeholder || item.label"
              ></a-date-picker>
            </template>
            <template v-else-if="item.type === 'dateRange'">
              <a-range-picker
                v-model:value="formFields[item.key]"
                :show-time="{
                  format: 'HH:mm:ss',
                  defaultValue: [
                    dayjs('00:00:00', 'HH:mm:ss'),
                    dayjs('23:59:59', 'HH:mm:ss')
                  ]
                }"
                :disabled="item.disabled"
                :placeholder="item.placeholder || item.label"
                value-format="x"
                format="YYYY-MM-DD"
              ></a-range-picker>
            </template>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import type { FormItem, FormOptions } from '@/typings/component'
import { computed, onMounted, reactive, ref, toRaw } from 'vue'
import Dict from '@/dict/index'
import _ from 'lodash'
import dayjs from 'dayjs'

interface FormProps {
  formOptions: FormOptions
  dataSource?: any
}

const props = defineProps<FormProps>()

const formFields: {
  [key: string]: any
} = reactive({})

const formRef: any = ref(null)

const initFields = () => {
  if (props.formOptions.items?.length) {
    props.formOptions.items.forEach((item: FormItem) => {
      formFields[item.key] = props.dataSource
        ? props.dataSource[item.key]
        : undefined

      // defaultValue
      if (item.defaultValue && !props.dataSource) {
        formFields[item.key] = item.defaultValue()
      }

      // switch init to false
      if (item.type === 'switch' && formFields[item.key] === undefined) {
        formFields[item.key] = false
      }
    })
  }
}

const fieldItems = computed(() => {
  return (
    props.formOptions.items &&
    props.formOptions.items.map((item: FormItem) => {
      // handle rule of required
      if (item.required) {
        ;(item.rules = item.rules || []).push({
          required: true,
          message: `${item.label || item.key}不能为空`,
          trigger: 'blur'
        })
      }
      // handle options
      if (item.dictIndex && !item.options) {
        const dict = _.get(Dict, item.dictIndex)
        if (dict) {
          item.options = Object.keys(dict).map((key: any) => {
            if (!isNaN(key)) key = parseFloat(key)
            return {
              label: dict[key],
              value: key
            }
          })
        }
      }
      return item
    })
  )
})

const validate = async () => {
  return await formRef.value.validate()
}

const clearFields = () => {
  formRef.value.resetFields()
}

onMounted(() => {
  initFields()
})

defineExpose({
  validate,
  formFields,
  clearFields,
  initFields
})
</script>

<style lang="less"></style>
