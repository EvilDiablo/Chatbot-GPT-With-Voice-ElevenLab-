import openai
import os
from dotenv import load_dotenv
from elevenlabs import generate, set_api_key,play

load_dotenv()

openai.api_key = os.getenv("GPT_API")

def get_response(input: str):  
    messages = [
        {"role": "user", "content": input}
    ]
    completion = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=messages
    )
    reply = completion.choices[0].message.content
    return reply

def get_voice(input:str):
    
    set_api_key(os.getenv("ELEVENLAB_API"))  

    audio = generate(
        text=input,
        voice='Freya',  # premade voice
        model="eleven_multilingual_v2"
    )

    return audio