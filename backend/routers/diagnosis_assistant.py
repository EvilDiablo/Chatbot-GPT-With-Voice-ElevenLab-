from fastapi import FastAPI, UploadFile, File, HTTPException, APIRouter
from fastapi.responses import JSONResponse
from openai import OpenAI
import os
from core.config import settings
import base64

insturction = """You are an orthopedic assistant helping to analyze X-ray images. Please extract clinically relevant information that orthopedic surgeons typically focus on. These include:

Joint alignment (e.g., varus/valgus angles)

Bone integrity (fractures, cortical continuity, bone density)

Joint space narrowing (indicating osteoarthritis)

Implant position (if post-op)

Anatomical angles, such as:

Neck-Shaft Angle (typically for hip X-rays)

Tibiofemoral Angle (for knee alignment)

Bohler’s Angle (for calcaneus injuries)

Lateral distal femoral angle

Signs of healing (callus formation, remodeling)

Hardware assessment (screws, plates, alignment)

Deformities (malunion, subluxation, dislocation)

Summarize your findings using orthopedic terminology and measurements if visible. If the image quality is poor or incomplete, indicate that clearly."""

router = APIRouter(
    responses={404: {"description": "error"}}
)

client = OpenAI(
    api_key=settings.OPENAI_CREDENTIAL_KEY,
)


@router.post("/analyze-image/")
async def analyze_image(file: UploadFile = File(...)):
    if file.content_type.split("/")[0] != "image":
        raise HTTPException(status_code=400, detail="Please upload a images.")
     
    image_data = await file.read()

    try:
        b64_image = base64.b64encode(image_data).decode("utf-8")

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Please perform a professional analysis of this X‑ray image. Extract clinically relevant information ..."},
                    {"type": "image_url", "image_url": {"url": f"data:{file.content_type};base64,{b64_image}"}}
                ]
            }
        ]

        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=300,
            temperature=0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model error：{e}")

    result = resp.choices[0].message.content
    return JSONResponse(content={"analysis": result})
