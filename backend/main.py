import base64
from fastapi import FastAPI, Form
from pydantic import BaseModel
from utils import get_response, get_voice
from elevenlabs import generate, set_api_key,play
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI()

origins = [
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


voice_input_data = None

@app.get("/")
async def say_ok():
    return{"message": "ok"}

@app.post("/chat-response")
async def generate_chat_response(request: str = Form(...)): 
    try:
        responses = get_response(request)  
        global voice_input_data
        voice_input_data = responses

        return responses
    except Exception as e:
        return {"error": str(e)}

    
@app.post("/voice-over")
async def voice_over(voice_data:str = Form(...)):
    try:
        responses = get_voice(voice_data)  

        return base64.b64encode(responses).decode('utf-8')
    except Exception as e :
        return {"error": str(e)}
    
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000,
                log_level="info", reload=True)