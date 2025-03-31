<template>
	<div>
		<ul>
      <li v-for="(wifi, idx) in mockList" :key="idx" @click="focus(idx)" class="wifi-item">
        <div class="wifi-line">
          <div class="flex-box">
            <div class="wifi-icon">
              <div class="wifi-symbol">
                <div class="wifi-circle first"></div>
                <div class="wifi-circle second"></div>
                <div class="wifi-circle third"></div>
                <div class="wifi-circle fourth"></div>
              </div>
            </div>
            <span>{{ wifi }}</span>
          </div>
          <span @click="wifiConnect(idx)" class="wifi-connect">连接</span>
        </div>
        <a-input-password
          v-if="showInputPwd === idx"
          v-model:value="pwd"
          placeholder="请输入密码"
          :disabled="connecting"
          class="pwd-input"
        />
      </li>
    </ul>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const showInputPwd = ref(-1);
const pwd = ref('');
const connecting = ref(false);
const mockList = [
  'wifi1',
  'wifi2',
  'wifi3',
  'wifi3',
  'wifi3',
  'wifi3',
  'wifi3',
  'wifi3',
  'wifi3',
  'wifi3',
  'wifi3',
  'wifi3',
  'wifi3',
  'wifi3',
  'wifi3',
  'wifi3',
];

const focus = (idx: number) => {
  showInputPwd.value = idx;
  pwd.value = '';
}

const wifiConnect = (idx: number) => {
  if (showInputPwd.value !== idx) return focus(idx);
  // 连接
  connecting.value = true;
}
</script>

<style lang="less" scoped>
ul {
  max-height: 400px;
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: scroll;
}

.wifi-item {
  box-sizing: border-box;
  width: 100%;
  padding: 10px;
  background-color: #fff;
  transition: 0.2s linear;

  .wifi-line {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .flex-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
    }
  }

  &:hover {
    background-color: #f0f0f0;
  }

  .wifi-connect {
    cursor: pointer;
    color: skyblue;
  }

  .pwd-input {
    width: 250px;
    margin-top: 8px;
  }
}

.wifi-icon {
  position: relative;
  width: 25px;
  height: 25px;
  margin-right: 10px;

  .wifi-symbol {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    overflow: hidden;
    transform: rotate(45deg);
    position: absolute;
    top: -30%;

    .wifi-circle {
      border: 3px solid #ccc;// 根据box高度宽度设置 border宽度，根据几个信号改变border颜色
      border-radius: 50%;
      position: absolute;
    }
    .first {
      width: 140%;
      height: 140%;
      top: 30%;
      left: 30%;
    }
    .second {
      width: 100%;
      height: 100%;
      top: 50%;
      left: 50%;
    }
    .third {
      width: 60%;
      height: 60%;
      top: 70%;
      left: 70%;
    }
    .fourth {
      width: 15%;
      height: 15%;
      top: 90%;
      left: 90%;
    }
  }
}
</style>
  