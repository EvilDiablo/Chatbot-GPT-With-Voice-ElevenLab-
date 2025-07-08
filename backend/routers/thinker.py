from fastapi import Form, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from openai import AzureOpenAI
from core.config import settings
import time 

router = APIRouter(
    responses={404: {"description": "error"}}
)


@router.post("/thinker")
async def update_label_and_region(patient_information: str, query: str):
    instruction = """You are a professional medical document assistant. I have uploaded a Word medical file. Based on its content, please extract and summarize the following four types of information. Present the result in English in the format below:
                     Allergies:
                     Medical History:
                     Surgical History:
                     Precautions / Recommendations:

                     Only include information that is directly related to the patient. If a category is not mentioned in the document, write “No relevant information.” Use concise, clinical language."""

    
    client = AzureOpenAI(
        azure_endpoint=settings.CLIENT_CREDENTIAL_ENDPOINT,
        api_key=settings.CLIENT_CREDENTIAL_KEY,
        api_version="2024-05-01-preview"
    )

    thread = client.beta.threads.create()

    client.beta.threads.messages.create(
        thread_id=thread.id,
        role="user",
        content = query
    )

    run = client.beta.threads.runs.create(
        thread_id=thread.id,
        assistant_id=settings.ASSISTANT_ID,
        additional_instructions=instruction
    )

    while run.status not in ["completed", "failed"]:
        print("Responting")
        time.sleep(1)
        run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)

    if run.status == 'completed':
        messages = client.beta.threads.messages.list(thread_id=thread.id)
        message = messages.data[0].content[0].text.value
        print(messages.data[0].content[0].text.value)