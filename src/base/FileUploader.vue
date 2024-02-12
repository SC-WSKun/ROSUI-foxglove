<template>
  <div class="FileUploader">
    <template v-if="uploadOptions.fileType === 'image/*'">
      <a-upload
        v-model:fileList="fileList"
        list-type="picture-card"
        :maxCount="uploadOptions.multiple ? uploadOptions.max || 3 : 1"
        :multiple="uploadOptions.multiple"
        :customRequest="customUpload"
        @preview="onHandlePreview"
        @remove="onHandleRemove"
        :accept="uploadOptions.fileType"
      >
        <div v-if="fileList.length < (uploadOptions.max || 1)">
          <plus-outlined />
          <div style="margin-top: 8px">点击上传</div>
        </div>
      </a-upload>
      <a-modal
        v-model:open="previewVisible"
        :title="previewTitle"
        :footer="null"
      >
        <img alt="example" style="width: 100%" :src="previewImgUrl" />
      </a-modal>
    </template>
    <template v-else>
      <a-upload
        v-model:file-list="fileList"
        :maxCount="uploadOptions.multiple ? uploadOptions.max || 3 : 1"
        :accept="uploadOptions.fileType || '*'"
        :multiple="uploadOptions.multiple"
        :customRequest="customUpload"
        @remove="onHandleRemove"
      >
        <a-button>
          <upload-outlined />
          点击上传
        </a-button>
      </a-upload>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, type Ref, nextTick } from 'vue'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons-vue'
import { upload } from '@/api/upload'
import { useGlobalStore } from '@/stores/global'
import _ from 'lodash'
import { downloadUrl } from '@/config'

const props = defineProps(['modelValue', 'uploadOptions'])
const emit = defineEmits(['update:modelValue'])

const previewVisible = ref(false)
const fileList: Ref<any[]> = ref([])
const previewImgUrl = ref('')
const previewTitle = ref('')
const globalStore = useGlobalStore()

const onHandlePreview = (e: any) => {
  previewImgUrl.value = e.thumbUrl
  previewVisible.value = true
  previewTitle.value = e.name
}

const customUpload = (e: any) => {
  globalStore.setLoading(true, '文件上传中...')
  upload(e.file)
    .then((res) => {
      e.onSuccess(res)
      globalStore.setLoading(false)
      updateModalValue()
    })
    .catch((err) => {
      e.onError(err)
    })
}

const onHandleRemove = (file: any) => {
  _.remove(fileList.value, (curr: any) => file.uid === curr.uid)
  updateModalValue()
}

const updateModalValue = () => {
  emit(
    'update:modelValue',
    !_.get(props.uploadOptions, 'multiple')
      ? fileList.value.map(
          (file) =>
            _.get(file, 'response.data.file_id') ||
            _.get(file, 'response.value.data.file_id')
        )[0]
      : fileList.value.map(
          (file) =>
            _.get(file, 'response.data.file_id') ||
            _.get(file, 'response.value.data.file_id')
        )
  )
}

onMounted(() => {
  nextTick(() => {
    if (props.modelValue) {
      fileList.value = [
        {
          uid: props.modelValue,
          name: props.modelValue,
          status: 'done',
          thumbUrl: downloadUrl + props.modelValue
        }
      ]
      console.log(fileList.value[0].url)
    }
  })
})
</script>

<style lang="less"></style>
