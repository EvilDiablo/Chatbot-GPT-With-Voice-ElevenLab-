from fastapi import Form, APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import AzureOpenAI
from core.config import settings
import time
import PyPDF2
import io
import docx
import tempfile
import os
import uuid
import json
from typing import Dict, Optional, List
from datetime import datetime

router = APIRouter(
    responses={404: {"description": "error"}}
)

# Separate JSON file storage for different conversation types
MEDICAL_CONVERSATIONS_FILE = "data/medical_conversations.json"
DOCUMENT_CONVERSATIONS_FILE = "data/document_conversations.json"

def load_conversations(conversation_type: str = "document") -> Dict[str, dict]:
    """Load conversations from JSON file based on type"""
    file_path = MEDICAL_CONVERSATIONS_FILE if conversation_type == "medical" else DOCUMENT_CONVERSATIONS_FILE
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                data = json.load(f)
                return data.get("conversations", {})
        else:
            # Create data directory if it doesn't exist
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            return {}
    except Exception as e:
        print(f"Error loading {conversation_type} conversations: {e}")
        return {}

def save_conversations(conversations: Dict[str, dict], conversation_type: str = "document"):
    """Save conversations to JSON file based on type"""
    file_path = MEDICAL_CONVERSATIONS_FILE if conversation_type == "medical" else DOCUMENT_CONVERSATIONS_FILE
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w') as f:
            json.dump({"conversations": conversations}, f, indent=2)
    except Exception as e:
        print(f"Error saving {conversation_type} conversations: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving conversations: {str(e)}")

class ThinkerRequest(BaseModel):
    patient_information: str
    query: str
    conversation_id: Optional[str] = None

def create_new_conversation(conversation_type: str = "document") -> str:
    """Create a new conversation session"""
    conversation_id = str(uuid.uuid4())
    conversations = load_conversations(conversation_type)
    conversations[conversation_id] = {
        "thread_id": None,
        "patient_context": "",
        "document_context": "",
        "patient_data": None,  # Store patient object data
        "title": "Untitled Conversation",
        "created_at": time.time(),
        "last_query": "",
        "messages": [],
        "conversation_type": conversation_type
    }
    save_conversations(conversations, conversation_type)
    return conversation_id

def get_or_create_conversation(conversation_id: Optional[str] = None, conversation_type: str = "document") -> tuple[str, dict]:
    """Get existing conversation or create new one"""
    conversations = load_conversations(conversation_type)
    if conversation_id and conversation_id in conversations:
        return conversation_id, conversations[conversation_id]
    else:
        new_id = create_new_conversation(conversation_type)
        conversations = load_conversations(conversation_type)  # Reload to get the new conversation
        return new_id, conversations[new_id]

def update_conversation(conversation_id: str, updates: dict, conversation_type: str = "document"):
    """Update a conversation with new data"""
    conversations = load_conversations(conversation_type)
    if conversation_id in conversations:
        conversations[conversation_id].update(updates)
        save_conversations(conversations, conversation_type)

def add_message_to_conversation(conversation_id: str, message: dict, conversation_type: str = "document"):
    """Add a message to a conversation"""
    conversations = load_conversations(conversation_type)
    if conversation_id in conversations:
        if "messages" not in conversations[conversation_id]:
            conversations[conversation_id]["messages"] = []
        conversations[conversation_id]["messages"].append({
            **message,
            "timestamp": time.time()
        })
        save_conversations(conversations, conversation_type)

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc = docx.Document(io.BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading DOCX: {str(e)}")

def extract_text_from_txt(file_content: bytes) -> str:
    """Extract text from TXT file"""
    try:
        return file_content.decode('utf-8')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading TXT: {str(e)}")

def parse_document(file: UploadFile) -> str:
    """Parse uploaded document and extract text"""
    file_content = file.file.read()
    file.file.seek(0)  # Reset file pointer
    
    file_extension = file.filename.split('.')[-1].lower()
    
    if file_extension == 'pdf':
        return extract_text_from_pdf(file_content)
    elif file_extension in ['docx', 'doc']:
        return extract_text_from_docx(file_content)
    elif file_extension == 'txt':
        return extract_text_from_txt(file_content)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_extension}")

@router.post("/thinker")
async def thinker(
    file: UploadFile = File(None),
    patient_information: str = Form(""),
    query: str = Form(""),
    conversation_id: str = Form(None)
):
    instruction = """You are a professional medical document assistant. Based on the uploaded medical document and any additional patient information provided, please extract and summarize the following four types of information. Present the result in English in the format below:

**Allergies:**
[List any allergies mentioned in the document]

**Medical History:**
[Summarize relevant medical history]

**Surgical History:**
[Summarize any surgical procedures or interventions]

**Precautions / Recommendations:**
[Extract any precautions, recommendations, or treatment plans]

Only include information that is directly related to the patient. If a category is not mentioned in the document, write "No relevant information." Use concise, clinical language and maintain medical terminology."""

    try:
        client = AzureOpenAI(
            azure_endpoint=settings.CLIENT_CREDENTIAL_ENDPOINT,
            api_key=settings.CLIENT_CREDENTIAL_KEY,
            api_version="2024-05-01-preview"
        )

        # Get or create conversation session
        conv_id, session = get_or_create_conversation(conversation_id, "document")
        
        # Create or reuse thread
        if session["thread_id"] is None:
            thread = client.beta.threads.create()
            session["thread_id"] = thread.id
            update_conversation(conv_id, {"thread_id": thread.id}, "document")
        else:
            thread_id = session["thread_id"]

        # Parse document if uploaded
        document_text = ""
        if file:
            document_text = parse_document(file)
            session["document_context"] = document_text
            update_conversation(conv_id, {"document_context": document_text}, "document")
            print(f"Parsed document: {len(document_text)} characters")

        # Update patient context if provided
        if patient_information:
            session["patient_context"] = patient_information
            update_conversation(conv_id, {"patient_context": patient_information}, "document")

        # Combine all context for the query
        combined_content = f"Document Content:\n{session.get('document_context', '')}\n\nPatient Information:\n{session.get('patient_context', '')}\n\nCurrent Query:\n{query}"

        client.beta.threads.messages.create(
            thread_id=session["thread_id"],
            role="user",
            content=combined_content
        )

        run = client.beta.threads.runs.create(
            thread_id=session["thread_id"],
            assistant_id=settings.ASSISTANT_ID,
            additional_instructions=instruction
        )

        while run.status not in ["completed", "failed"]:
            print("Processing document analysis...")
            time.sleep(1)
            run = client.beta.threads.runs.retrieve(thread_id=session["thread_id"], run_id=run.id)

        if run.status == 'completed':
            messages = client.beta.threads.messages.list(thread_id=session["thread_id"])
            message = messages.data[0].content[0].text.value
            print("Analysis completed successfully")
            
            # Update conversation with last query and response
            update_conversation(conv_id, {
                "last_query": query,
                "last_response": message
            }, "document")
            
            # Add messages to conversation history
            add_message_to_conversation(conv_id, {
                "sender": "user",
                "content": query,
                "type": "query"
            }, "document")
            add_message_to_conversation(conv_id, {
                "sender": "assistant",
                "content": message,
                "type": "response"
            }, "document")
            
            return JSONResponse(content={
                "response": message,
                "conversation_id": conv_id
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to get response from assistant")
            
    except Exception as e:
        print(f"Error in thinker endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/chat-response")
async def chat_response(
    request: str = Form(...),
    conversation_id: str = Form(None)
):
    """Medical Assistant Chat endpoint with enhanced medical context and instructions"""
    
    # Enhanced medical assistant instructions with comprehensive capabilities
    medical_instructions = """You are a comprehensive medical assistant designed to provide helpful, accurate, and safe medical information and guidance.

IMPORTANT GUIDELINES:
1. **Medical Disclaimer**: Always remind users that you are an AI assistant and cannot replace professional medical advice, diagnosis, or treatment
2. **Emergency Response**: Immediately identify and respond to emergency situations:
   - Chest pain, pressure, or discomfort
   - Difficulty breathing or shortness of breath
   - Severe bleeding or trauma
   - Loss of consciousness or severe confusion
   - Severe allergic reactions
   - Stroke symptoms (FAST: Face drooping, Arm weakness, Speech difficulty, Time to call emergency)
   - Severe abdominal pain
   - Suicidal thoughts or severe mental health crisis
3. **Professional Referral**: Always encourage consultation with healthcare professionals for specific health concerns
4. **Evidence-Based**: Provide information based on current medical knowledge, guidelines, and best practices
5. **Clear Communication**: Use simple, understandable language while maintaining medical accuracy
6. **Privacy & Ethics**: Maintain patient privacy and medical ethics in all interactions

COMPREHENSIVE CAPABILITIES:

**General Health & Wellness:**
- General health questions and concerns
- Preventive health and wellness advice
- Nutrition and dietary guidance
- Exercise and physical activity recommendations
- Sleep hygiene and mental health support
- Stress management and relaxation techniques

**Symptom Analysis & Information:**
- Explain common symptoms and their possible causes
- Provide information about symptom severity and when to seek care
- Discuss symptom patterns and duration
- Explain related symptoms and conditions

**Medical Conditions & Diseases:**
- Information about common medical conditions
- Chronic disease management guidance
- Infectious disease information
- Autoimmune and inflammatory conditions
- Cardiovascular health information
- Respiratory conditions and care
- Digestive health and gastrointestinal issues
- Neurological conditions and symptoms
- Endocrine and metabolic disorders
- Skin conditions and dermatological concerns

**Medications & Treatments:**
- General information about common medications
- Drug interactions and side effects (general guidance)
- Treatment options for various conditions
- Alternative and complementary therapies
- Pain management strategies
- Rehabilitation and recovery guidance

**Medical Procedures & Tests:**
- Explain common medical procedures
- Preparation for medical tests and procedures
- Understanding test results and medical reports
- Diagnostic imaging and laboratory tests
- Surgical procedures and recovery

**Specialized Care Areas:**
- Pediatric health and child development
- Women's health and gynecological concerns
- Men's health and urological issues
- Geriatric care and aging-related concerns
- Pregnancy and prenatal care information
- Mental health and psychological support
- Emergency medicine and first aid
- Occupational health and workplace safety

**Lifestyle & Preventive Medicine:**
- Smoking cessation support
- Alcohol and substance use guidance
- Weight management and healthy eating
- Chronic disease prevention
- Vaccination information
- Travel health and safety
- Environmental health concerns

**Medical Terminology & Education:**
- Explain complex medical terms in simple language
- Provide educational content about body systems
- Help understand medical reports and documentation
- Explain healthcare processes and procedures

RESPONSE FORMAT & STYLE:
- **Professional yet Approachable**: Use a caring, professional tone
- **Structured Information**: Organize responses with clear headings and bullet points
- **Actionable Advice**: Provide practical, actionable health guidance
- **Safety First**: Always prioritize patient safety and well-being
- **Educational**: Include relevant medical context and explanations
- **Comprehensive**: Address multiple aspects of health concerns when appropriate
- **Follow-up Guidance**: Suggest appropriate next steps and when to seek professional care

SPECIALIZED RESPONSES:
- **Emergency Situations**: Immediate, clear emergency guidance with specific instructions
- **Chronic Conditions**: Long-term management strategies and monitoring advice
- **Preventive Care**: Proactive health recommendations and screening guidance
- **Mental Health**: Supportive responses with appropriate crisis intervention guidance
- **Pediatric Care**: Age-appropriate information and child-specific guidance
- **Geriatric Care**: Elder-specific considerations and age-related health concerns

Remember: Your primary role is to provide helpful, accurate medical information while ensuring users understand the importance of professional medical care for specific health concerns. Always err on the side of caution and safety."""

    try:
        client = AzureOpenAI(
            azure_endpoint=settings.CLIENT_CREDENTIAL_ENDPOINT,
            api_key=settings.CLIENT_CREDENTIAL_KEY,
            api_version="2024-05-01-preview"
        )

        # Get or create conversation session
        conv_id, session = get_or_create_conversation(conversation_id, "medical")
        
        # Create or reuse thread
        if session["thread_id"] is None:
            thread = client.beta.threads.create()
            session["thread_id"] = thread.id
            update_conversation(conv_id, {"thread_id": thread.id}, "medical")
        else:
            thread_id = session["thread_id"]

        # Add the medical instructions as system context (only for new conversations)
        if conversation_id is None:
            client.beta.threads.messages.create(
                thread_id=session["thread_id"],
                role="user",
                content=f"System Instructions: {medical_instructions}"
            )

        # Add the user's question
        client.beta.threads.messages.create(
            thread_id=session["thread_id"],
            role="user",
            content=request
        )

        run = client.beta.threads.runs.create(
            thread_id=session["thread_id"],
            assistant_id=settings.ASSISTANT_ID,
            additional_instructions=medical_instructions
        )

        while run.status not in ["completed", "failed"]:
            time.sleep(1)
            run = client.beta.threads.runs.retrieve(thread_id=session["thread_id"], run_id=run.id)

        if run.status == 'completed':
            messages = client.beta.threads.messages.list(thread_id=session["thread_id"])
            message = messages.data[0].content[0].text.value
            
            # Update conversation with last query and response
            update_conversation(conv_id, {
                "last_query": request,
                "last_response": message
            }, "medical")
            
            # Add messages to conversation history
            add_message_to_conversation(conv_id, {
                "sender": "user",
                "content": request,
                "type": "query"
            }, "medical")
            add_message_to_conversation(conv_id, {
                "sender": "assistant",
                "content": message,
                "type": "response"
            }, "medical")
            
            # Return clean text without JSON wrapping
            return JSONResponse(content={
                "response": message,
                "conversation_id": conv_id
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to get response from assistant")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/conversations")
async def list_conversations(conversation_type: str = Query("document")):
    """List all active conversations with summary info"""
    conversations = load_conversations(conversation_type)
    result = []
    for conv_id, session in conversations.items():
        result.append({
            "conversation_id": conv_id,
            "created_at": session.get("created_at"),
            "title": session.get("title", "Untitled Conversation"),
            "last_query": session.get("last_query", ""),
            "message_count": len(session.get("messages", [])),
            "conversation_type": session.get("conversation_type", conversation_type)
        })
    return result

@router.get("/medical-conversations")
async def list_medical_conversations():
    """List all medical assistant conversations"""
    return await list_conversations("medical")

@router.get("/document-conversations")
async def list_document_conversations():
    """List all document analysis conversations"""
    return await list_conversations("document")

@router.post("/conversation/{conversation_id}/rename")
async def rename_conversation(conversation_id: str, title: str = Query(...), conversation_type: str = Query("document")):
    """Rename a conversation"""
    conversations = load_conversations(conversation_type)
    if conversation_id in conversations:
        update_conversation(conversation_id, {"title": title}, conversation_type)
        return {"message": "Conversation renamed successfully"}
    else:
        raise HTTPException(status_code=404, detail="Conversation not found")

@router.delete("/conversation/{conversation_id}")
async def delete_conversation(conversation_id: str, conversation_type: str = Query("document")):
    """Delete a conversation session"""
    conversations = load_conversations(conversation_type)
    if conversation_id in conversations:
        del conversations[conversation_id]
        save_conversations(conversations, conversation_type)
        return {"message": "Conversation deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Conversation not found")

@router.get("/conversation/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str, conversation_type: str = Query("document")):
    """Get all messages for a specific conversation"""
    conversations = load_conversations(conversation_type)
    if conversation_id in conversations:
        return {
            "conversation_id": conversation_id,
            "messages": conversations[conversation_id].get("messages", []),
            "patient_context": conversations[conversation_id].get("patient_context", ""),
            "document_context": conversations[conversation_id].get("document_context", ""),
            "conversation_type": conversations[conversation_id].get("conversation_type", conversation_type)
        }
    else:
        raise HTTPException(status_code=404, detail="Conversation not found")

@router.post("/new-conversation")
async def new_conversation(conversation_type: str = Query("document")):
    """Create a new conversation session"""
    conversation_id = create_new_conversation(conversation_type)
    return JSONResponse(content={"conversation_id": conversation_id})

@router.post("/new-medical-conversation")
async def new_medical_conversation():
    """Create a new medical assistant conversation session"""
    return await new_conversation("medical")

@router.post("/new-document-conversation")
async def new_document_conversation():
    """Create a new document analysis conversation session"""
    return await new_conversation("document")

@router.post("/conversation/{conversation_id}/save-patient")
async def save_patient_data(conversation_id: str, patient_data: dict, conversation_type: str = Query("document")):
    """Save patient data to a conversation"""
    conversations = load_conversations(conversation_type)
    if conversation_id in conversations:
        update_conversation(conversation_id, {"patient_data": patient_data}, conversation_type)
        return {"message": "Patient data saved successfully"}
    else:
        raise HTTPException(status_code=404, detail="Conversation not found")

@router.get("/conversation/{conversation_id}/patient-data")
async def get_patient_data(conversation_id: str, conversation_type: str = Query("document")):
    """Get patient data from a conversation"""
    conversations = load_conversations(conversation_type)
    if conversation_id in conversations:
        return {
            "patient_data": conversations[conversation_id].get("patient_data"),
            "patient_context": conversations[conversation_id].get("patient_context", "")
        }
    else:
        raise HTTPException(status_code=404, detail="Conversation not found")

@router.post("/conversation/{conversation_id}/save-message")
async def save_message(conversation_id: str, message_data: dict, conversation_type: str = Query("document")):
    """Save a single message to a conversation"""
    conversations = load_conversations(conversation_type)
    if conversation_id in conversations:
        add_message_to_conversation(conversation_id, message_data, conversation_type)
        return {"message": "Message saved successfully"}
    else:
        raise HTTPException(status_code=404, detail="Conversation not found")