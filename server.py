import os
import uuid
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import edge_tts
import json
from dotenv import load_dotenv

# --- 配置區 ---
load_dotenv()
# 請將這裡換成你的 Google API Key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("Warning: GOOGLE_API_KEY is not set in environment variables.")

genai.configure(api_key=GOOGLE_API_KEY)

app = FastAPI()

# 允許跨域 (讓前端網頁可以呼叫後端)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 掛載靜態目錄，讓前端可以讀取生成的 mp3
app.mount("/static", StaticFiles(directory="static"), name="static")

# 初始化 Gemini 模型
model = genai.GenerativeModel('gemini-2.5-flash-lite')

# 設定 System Prompt，強制 AI 回傳 JSON 格式
SYSTEM_PROMPT = """
你現在是一個可愛的二次元少女 Hiyori。
請根據用戶的輸入進行回覆。
必須嚴格使用 JSON 格式回傳，格式如下：
{
    "text": "你的回答內容",
    "emotion": "你的情緒 (只能選: 0, 1, 2, 3)"
}
情緒代碼對照：0=普通(Normal), 1=開心(Happy), 2=生氣(Angry), 3=悲傷(Sad)。
回答要簡短、口語化、像個朋友一樣。
"""

@app.post("/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    user_text = data.get("message", "")

    # 1. 呼叫 Gemini
    try:
        chat = model.start_chat(history=[])
        response = chat.send_message(f"{SYSTEM_PROMPT}\n用戶說: {user_text}")
        
        # 清理回應，確保是純 JSON
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        ai_data = json.loads(clean_text)
        
        reply_text = ai_data["text"]
        emotion_code = int(ai_data["emotion"])

    except Exception as e:
        print(f"LLM Error: {e}")
        reply_text = "抱歉，我的大腦好像卡住了..."
        emotion_code = 3 # 悲傷

    # 2. 生成語音 (Edge-TTS)
    voice = "zh-CN-XiaoxiaoNeural"
    filename = f"reply_{uuid.uuid4()}.mp3"
    output_path = os.path.join("static", filename)
    
    communicate = edge_tts.Communicate(reply_text, voice)
    mp3_bytes = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            mp3_bytes += chunk["data"]
            
    import base64
    audio_base64 = base64.b64encode(mp3_bytes).decode('utf-8')
    audio_url = f"data:audio/mp3;base64,{audio_base64}"

    # 3. 回傳給前端
    return JSONResponse({
        "text": reply_text,
        "emotion": emotion_code,
        "audio_url": audio_url
    })

@app.post("/echo")
async def echo_endpoint(request: Request):
    data = await request.json()
    text = data.get("message", "")
    
    # 這裡不經過 AI，直接使用使用者輸入的文字
    # 預設情緒為 0 (普通)
    emotion_code = 0
    
    # 2. 生成語音 (Edge-TTS)
    voice = "zh-CN-XiaoxiaoNeural"
    
    communicate = edge_tts.Communicate(text, voice)
    mp3_bytes = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            mp3_bytes += chunk["data"]
            
    import base64
    audio_base64 = base64.b64encode(mp3_bytes).decode('utf-8')
    audio_url = f"data:audio/mp3;base64,{audio_base64}"

    return JSONResponse({
        "text": text,
        "emotion": emotion_code,
        "audio_url": audio_url
    })

if __name__ == "__main__":
    import uvicorn
    # 啟動伺服器
    uvicorn.run(app, host="127.0.0.1", port=8000)