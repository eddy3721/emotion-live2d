# Live2D AI Chat Demo

一個結合 Live2D 虛擬角色、Google Gemini AI 與 Edge-TTS 的互動網頁應用程式。

## ✨ 特色

- **Live2D 角色互動**：使用 PIXI.js 與 Live2D SDK 呈現生動的虛擬角色 (Hiyori)。
- **AI 智能對話**：整合 Google Gemini API (gemini-2.5-flash-lite)，賦予角色個性化的對話能力。
- **即時語音生成**：使用 Edge-TTS 將 AI 的回應轉為語音並播放。
- **嘴型同步 (Lip Sync)**：角色的嘴型會隨著語音自動開合。
- **情緒表達**：AI 會根據對話內容判斷情緒 (開心、生氣、悲傷)，並同步改變角色的表情。

## 🛠️ 技術棧

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Live2D Engine**: PIXI.js, pixi-live2d-display
- **Backend**: Python, FastAPI
- **AI Model**: Google Gemini (generativeai)
- **TTS**: edge-tts

## 🚀 快速開始

### 1. 安裝環境

確保你已經安裝了 Python 3.8+。

```bash
# 安裝相依套件
pip install -r requirements.txt
```

### 2. 設定 API Key

2.1 複製環境變數範例檔：
```bash
cp .env.example .env
```
(Windows CMD 使用 `copy .env.example .env`)

2.2 打開 `.env` 檔案，填入你的 Google Gemini API Key：
```env
GOOGLE_API_KEY=你的_GOOGLE_API_KEY
```

### 3. 啟動伺服器

```bash
python server.py
```
伺服器預設會在 `http://127.0.0.1:8000` 啟動。

### 4. 開啟網頁

直接用瀏覽器打開 `index.html`，或者透過 VS Code 的 Live Server 插件開啟。
(建議使用 Live Server 以避免本地檔案讀取的 CORS 問題，雖然 server.py 已設定 CORS 允許所有來源)

## 🎮 如何使用

1. **語音測試**：
   - 在左側的「語音測試」輸入框輸入文字。
   - 點擊「測試」，角色會直接朗讀你輸入的文字 (Echo 模式)。

2. **AI 對話**：
   - 在右側的「AI 對話」輸入框輸入你想對 Hiyori 說的話。
   - 點擊「發送」，AI 會根據設定的人設 (可愛的二次元少女) 回覆你，並帶有語音和表情變化。

## 📂 專案結構

- `index.html`: 前端主頁面
- `script.js`: 前端邏輯 (Live2D 控制、API 串接、音訊處理)
- `style.css`: 頁面樣式
- `server.py`: FastAPI 後端伺服器
- `requirements.txt`: Python 套件需求
- `models/`: Live2D 模型檔案
- `static/`: 靜態文件檔案
- `.env`: 環境變數設定

## ⚠️ 注意事項

- 本專案使用 `edge-tts` 需要聯網才能生成語音。
- 請確保 Live2D 模型路徑正確設定在 `script.js` 中。
