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
import { ref } from 'vue'
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

const showBtnText = () => {
    return generateStatus.value === Cert_Status.Waiting || generateStatus.value === Cert_Status.Generated || generateStatus.value === Cert_Status.Downloaded
}

const createCert = () => {
    console.log('start create cert')
    domainApi.post('/robot').then(res => {
        console.log('create robot success:', res)
    })
}

const handleBtnClick = () => {
    console.log('click btn')
    switch (generateStatus.value) {
        case Cert_Status.Waiting:
            generateStatus.value = Cert_Status.Generating
            btnText.value = '生成证书中'
            createCert()
            break;
        case Cert_Status.Generating:
            return;
        case Cert_Status.Generated:
            generateStatus.value = Cert_Status.Downloading
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
