// --- 設定與初始化 ---
const app = new PIXI.Application({
    view: document.getElementById('live2d-canvas'),
    autoStart: true,
    resizeTo: window, // 隨視窗大小調整
    backgroundColor: 0x000000,
    backgroundAlpha: 0 // 透明背景，讓 CSS 控制背景
});

let currentModel = null;
let audioContext = null;
let audioAnalyser = null;

// --- 載入 Live2D 模型 ---
async function loadModel() {
    // 假設模型路徑一致
    const modelPath = 'models/model_2/runtime/hiyori_pro_t11.model3.json';

    try {
        const model = await PIXI.live2d.Live2DModel.from(modelPath);
        app.stage.addChild(model);

        // 調整模型位置與大小
        // 根據畫面大小動態調整
        const scaleX = (app.screen.width * 1) / model.width;
        const scaleY = (app.screen.height * 1) / model.height;
        // 選擇較小的縮放比例以確保整體可見，但稍微放大一點營造近距離感
        const scale = Math.min(scaleX, scaleY) * 2.5;

        model.scale.set(scale);
        model.x = app.screen.width / 2;
        model.y = app.screen.height * 2.5; // 放在偏下方
        model.anchor.set(0.5, 1.0); // 錨點設在底部中心

        currentModel = model;
        console.log("模型載入成功！");

    } catch (e) {
        console.error("模型載入失敗:", e);
        document.getElementById('dialogue-text').innerText = "模型載入失敗，請檢查 Console...";
    }
}
loadModel();

// --- 嘴型同步與表情控制邏輯 ---
let lastVolume = 0;
let currentExpressionParams = {}; // 儲存當前表情參數

app.ticker.add(() => {
    if (!currentModel) return;

    // 1. 嘴型同步 (Lip Sync)
    if (audioAnalyser) {
        const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
        audioAnalyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        let average = sum / dataArray.length;

        const threshold = 25;
        const sensitivity = 35;

        let targetOpen = Math.max(0, (average - threshold) / sensitivity);

        if (average < lastVolume * 0.9) {
            targetOpen = 0;
        }

        targetOpen = Math.min(1.0, targetOpen) * 0.6;
        lastVolume = average;

        currentModel.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', targetOpen);
    } else {
        currentModel.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', 0);
        lastVolume = 0;
    }

    // 2. 強制覆蓋表情參數 (防止被 Idle 動畫蓋過)
    const coreModel = currentModel.internalModel.coreModel;
    for (const [id, value] of Object.entries(currentExpressionParams)) {
        coreModel.setParameterValueById(id, value);
    }
});

// --- 表情控制 ---
function setExpression(emotionCode) {
    if (!currentModel) return;

    // 重置參數儲存
    currentExpressionParams = {};

    // 定義表情參數
    switch (emotionCode) {
        case 1: // 開心 (Happy)
            currentExpressionParams['ParamBrowLY'] = 0.8;
            currentExpressionParams['ParamBrowRY'] = 0.8;
            currentExpressionParams['ParamEyeLOpen'] = 1.0;
            currentExpressionParams['ParamEyeROpen'] = 1.0;
            currentExpressionParams['ParamMouthForm'] = 1.0;
            currentExpressionParams['ParamCheek'] = 1.0;
            break;
        case 2: // 生氣 (Angry)
            currentExpressionParams['ParamBrowLY'] = -1;
            currentExpressionParams['ParamBrowRY'] = -1;
            currentExpressionParams['ParamBrowLAngle'] = -1;
            currentExpressionParams['ParamBrowRAngle'] = -1;
            currentExpressionParams['ParamMouthForm'] = -1.0;
            break;
        case 3: // 悲傷 (Sad)
            currentExpressionParams['ParamBrowLY'] = -0.3;
            currentExpressionParams['ParamBrowRY'] = -0.3;
            currentExpressionParams['ParamBrowLAngle'] = 0.3;
            currentExpressionParams['ParamBrowRAngle'] = 0.3;
            currentExpressionParams['ParamBrowLForm'] = -1;
            currentExpressionParams['ParamBrowRForm'] = -1;
            currentExpressionParams['ParamMouthForm'] = -1;
            break;
        default: // 普通 (Normal)
            // 清空參數，讓 Idle 動畫接手
            currentExpressionParams = {};
            break;
    }
}

// --- 互動邏輯 (語音測試) ---
const testInput = document.getElementById('test-input');
const testBtn = document.getElementById('test-btn');
const dialogueText = document.getElementById('dialogue-text');

let typingInterval = null;

function typeText(text, element, speed = 180) { // 加快打字速度
    if (typingInterval) clearInterval(typingInterval);
    element.innerText = '';

    let i = 0;
    typingInterval = setInterval(() => {
        element.innerText += text.charAt(i);
        element.scrollTop = element.scrollHeight; // Auto scroll to bottom
        i++;
        if (i >= text.length) {
            clearInterval(typingInterval);
            typingInterval = null;
        }
    }, speed);
}

async function sendTestMessage() {
    const text = testInput.value.trim();
    if (!text) return;

    // UI 更新
    testInput.value = '';
    dialogueText.innerText = "......（生成語音中）";
    dialogueText.style.color = "#aaa";

    try {
        // 呼叫後端 /echo
        const res = await fetch('http://127.0.0.1:8000/echo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();

        // 顯示文字
        typeText(data.text, dialogueText);
        dialogueText.style.color = "#fff";

        // 設定表情
        setExpression(data.emotion);

        // 播放語音
        playAudio(data.audio_url);

    } catch (err) {
        console.error(err);
        dialogueText.innerText = "錯誤: " + err.message;
        dialogueText.style.color = "red";
    }
}

// --- 互動邏輯 (AI 聊天) ---
const aiInput = document.getElementById('ai-input');
const aiBtn = document.getElementById('ai-btn');

async function sendAiMessage() {
    const text = aiInput.value.trim();
    if (!text) return;

    // UI 更新
    aiInput.value = '';
    aiInput.disabled = true;
    aiBtn.disabled = true;
    aiBtn.innerText = "思考中...";

    dialogueText.innerText = "......";
    dialogueText.style.color = "#aaa";

    try {
        // 呼叫後端 /chat
        const res = await fetch('http://127.0.0.1:8000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        const data = await res.json();

        // 顯示文字
        typeText(data.text, dialogueText);
        dialogueText.style.color = "#fff";

        // 設定表情
        setExpression(data.emotion);

        // 播放語音
        playAudio(data.audio_url);

    } catch (err) {
        console.error(err);
        dialogueText.innerText = "錯誤: " + err.message;
        dialogueText.style.color = "red";
    } finally {
        aiInput.disabled = false;
        aiBtn.disabled = false;
        aiBtn.innerText = "發送";
        aiInput.focus();
    }
}

// --- 播放音訊 ---
function playAudio(url) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";

    const source = audioContext.createMediaElementSource(audio);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    audioAnalyser = analyser;

    // --- 播放開始：暫停 Idle ---
    if (currentModel) {
        // 1. 停止當前所有動作 (MotionManager 可能沒有 stopAll，視具體版本而定，這裡先移除避免報錯)
        // currentModel.internalModel.motionManager.stopAll();

        // 2. 暫時移除 Idle 定義，防止自動開始新的 Idle
        // (保存起來以便之後恢復)
        if (!currentModel._savedIdleDefinitions) {
            currentModel._savedIdleDefinitions = currentModel.internalModel.motionManager.definitions['Idle'];
        }
        currentModel.internalModel.motionManager.definitions['Idle'] = [];
    }

    audio.play();

    audio.onended = () => {
        // --- 播放結束：恢復 Idle ---
        if (currentModel) {
            // 嘴巴閉上
            currentModel.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', 0);

            // 恢復 Idle 定義
            if (currentModel._savedIdleDefinitions) {
                currentModel.internalModel.motionManager.definitions['Idle'] = currentModel._savedIdleDefinitions;
                currentModel._savedIdleDefinitions = null;
            }

            // 立即開始一個 Idle 動作 (可選，讓它看起來自然)
            currentModel.internalModel.motionManager.startMotion('Idle', 0);
        }
    };
}

// --- Event Listeners ---
testBtn.addEventListener('click', sendTestMessage);
testInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendTestMessage();
});

aiBtn.addEventListener('click', sendAiMessage);
aiInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendAiMessage();
});
