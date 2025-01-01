<template>
    <div class="create-robot">
        <div v-motion :initial="{ scale: 1 }" :hovered="{ scale: 1.1 }" :tapped="{ scale: 0.9 }" class="btn create-btn"
            @click="handleBtnClick">
            <p v-if="showBtnText()">{{ btnText
                }}</p>
            <div v-else class="loading-box">
                <div class="loading three-balls-bounce">
                    <div class="circle"></div>
                    <div class="circle"></div>
                    <div class="circle"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import domainApi from '@/utils/domain-service'
import { message } from 'ant-design-vue'
import { watch, ref } from 'vue'
enum Cert_Status {
    'Waiting',
    'Generating',
    'Generated',
    'Downloading',
    'Downloaded',
    'Error'
}
const btnText = ref('开始创建')
const generateStatus = ref(Cert_Status.Waiting)
const certPath = ref('')
watch(generateStatus, (newValue) => {
    switch (newValue) {
        case Cert_Status.Waiting:
            btnText.value = '开始创建'
            break;
        case Cert_Status.Generated:
            btnText.value = '下载证书'
            break;
        case Cert_Status.Downloaded:
            btnText.value = '下载完成'
            break;
    }
})

/**
 * 是否显示按钮文字
 */
const showBtnText = () => {
    return generateStatus.value === Cert_Status.Waiting || generateStatus.value === Cert_Status.Generated || generateStatus.value === Cert_Status.Downloaded
}

/**
 * 创建机器人证书
 */
const createCert = () => {
    domainApi.post('/robot').then((res: any) => {
        if (res.code === 0) {
            generateStatus.value = Cert_Status.Generated
            certPath.value = res.certPath
        } else {
            generateStatus.value = Cert_Status.Error
            throw Error(res)
        }
    }).catch((error: any) => {
        console.error(error)
        message.error('创建机器人证书失败')
    })
}

/**
 * 下载机器人证书
 */
const downloadCert = () => {
    console.log('start download cert:', certPath.value)
    domainApi.get(`/robot/ssl?certPath=${certPath.value}`, { headers: { 'Content-Type': 'application/json; application/octet-stream' }, responseType: 'blob' }).then((res: any) => {
        const url = window.URL.createObjectURL(res)
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'robot.zip');
        document.body.appendChild(link);
        link.click();
        window.URL.revokeObjectURL(url);
    }).catch(error => {
        console.error(error)
        message.error('下载机器人证书失败')
    })
}

const handleBtnClick = () => {
    switch (generateStatus.value) {
        case Cert_Status.Waiting:
            generateStatus.value = Cert_Status.Generating
            createCert()
            break;
        case Cert_Status.Generating:
            return;
        case Cert_Status.Generated:
            generateStatus.value = Cert_Status.Downloading
            downloadCert()
            break;
        case Cert_Status.Downloading:
            return;
    }
}

</script>

<style lang="less" scoped>
.create-robot {
    .flex();
    width: 100%;
    height: 12vw;

    .btn {
        .flex(center, center, column);
        width: 10rem;
        height: 10rem;
        padding: 12px;
        border-radius: 50%;
        font-size: 20px;
    }

    .create-btn {
        background: @theme-color4;
        color: white;

        p {
            margin: 4px;
        }
    }

    .loading-box {
        .flex();
        width: 100%;
        position: relative;
        margin-top: -40px;
    }
}

.three-balls-bounce .circle {
    width: 15px;
    height: 15px;
    position: absolute;
    border-radius: 50%;
    background-color: white;
    left: 25%;
    transform-origin: 50%;
    animation: balls-circle 0.5s alternate-reverse infinite ease;
}

.three-balls-bounce .circle:nth-child(2) {
    left: 45%;
    animation-delay: 0.2s;
}

.three-balls-bounce .circle:nth-child(3) {
    left: auto;
    right: 25%;
    animation-delay: 0.3s;
}

@keyframes balls-circle {
    0% {
        top: 40px;
        height: 5px;
        border-radius: 50px 50px 25px 25px;
        transform: scaleX(1.7);
    }

    40% {
        height: 15px;
        border-radius: 50%;
        transform: scaleX(1);
    }

    100% {
        top: 0%;
    }
}
</style>
