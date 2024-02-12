<template>
  <div class="StepForm">
    <a-steps
      :current="state.current"
      :items="state.items"
      label-placement="vertical"
    ></a-steps>
    <div class="StepForm-content">
      <Form
        v-if="currentStep.type === 'form'"
        :formOptions="currentStep.formOptions"
        :dataSource="state.data[state.current] || currentStep.dataSource"
        ref="formRef"
      ></Form>
      <component
        v-else-if="currentStep.type === 'custom'"
        :is="currentStep.component"
        :dataSource="state.data[state.current] || currentStep.dataSource"
        :props="currentStep.props"
        ref="componentRef"
      ></component>
    </div>
    <div class="StepForm-action">
      <a-button
        size="large"
        @click="onHandlePrev"
        :disabled="state.current === 0"
        >上一步</a-button
      >
      <a-button type="primary" size="large" @click="onHandleNext">{{
        state.current >= state.items.length - 1 ? '提交' : '下一步'
      }}</a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormOptions, StepOptions } from '@/typings/component'
import { computed, onMounted, ref, reactive, type Ref } from 'vue'
import { message } from 'ant-design-vue'

interface Props {
  stepOptions: StepOptions
}

const props = defineProps<Props>()
const emit = defineEmits(['confirmHook'])

const formRef: any = ref(null)
const componentRef: any = ref(null)

const state: any = reactive({
  current: 0,
  items: [],
  data: []
})

const currentStep = computed(() => {
  return props.stepOptions.steps[state.current]
})

const onHandleNext = async () => {
  let data: any = undefined
  if (currentStep.value.type === 'form') {
    try {
      await formRef.value.validate()
      data = formRef.value.formFields
    } catch (error) {
      return
    }
  } else {
    try {
      await componentRef.value.validate()
      data = componentRef.value.data
    } catch (error) {
      return
    }
  }
  state.data[state.current] = data
  if (state.current === state.items.length - 1) {
    try {
      props.stepOptions.callback &&
        (await props.stepOptions.callback(state.data))
      emit('confirmHook')
      message.success('操作成功')
    } catch (error) {
      console.log(error)
    }
    return
  }
  state.items[state.current].status = 'finish'
  state.current += 1
  state.items[state.current].status = 'process'
}

const onHandlePrev = () => {
  state.items[state.current].status = 'wait'
  state.current -= 1
  state.items[state.current].status = 'process'
}

onMounted(() => {
  state.items = props.stepOptions.steps.map((step) => ({
    key: step.title,
    title: step.title,
    status: 'wait',
    disabled: true
  }))
  state.items[0].status = 'process'
})
</script>

<style lang="less" scoped>
.StepForm {
  &-content {
    margin: 40px 20px 20px;
  }

  &-action {
    .flex(space-between);
  }
}
</style>
