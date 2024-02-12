<template>
  <div class="NotFound">
    <div class="wrap">
      <div class="tips">
        <div class="text">
          <span class="error">404 ERROR</span>
          <h2>Page Not Found</h2>
          <p>Sorry, the page you requested could not be found</p>
        </div>
        <a-button type="primary" size="large" @click="goBack"
          ><LeftOutlined />Go Back</a-button
        >
      </div>
      <div class="photo">
        <img src="/404.png" alt="" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LeftOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.back()
}
</script>

<style lang="less">
.NotFound {
  width: 100vw;
  height: 100vh;
  .flex;

  .wrap {
    .flex(flex-start);
    width: 70%;
    height: 70%;
    box-shadow: 5px 5px 20px 5px rgba(0, 0, 0, 0.1);
    border-radius: 10px;
    position: relative;
    padding-left: 100px;
    padding-bottom: 100px;
  }

  .tips {
    height: 300px;
    font-size: 20px;
    margin-right: 50px;
    .flex(space-between, flex-start, column);
    position: relative;
    z-index: 1;

    .text {
      margin-bottom: 100px;
    }

    .error {
      font-size: 72px;
      font-weight: bold;
      margin-bottom: 20px;
    }
  }

  .photo {
    height: 100%;
    position: absolute;
    right: 0;
    top: 0;
    opacity: 0.4;
    z-index: 0;
    img {
      height: 100%;
    }
  }
}
</style>
