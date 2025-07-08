import os
import uvicorn
import time

from fastapi import FastAPI, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

# from core.logging import logger
from typing import Any, Callable, TypeVar

from routers.thinker import router as information_thinker
from routers.diagnosis_assistant import router as diagnosis_assistant

app = FastAPI(
    title="Clinic managment system",
    docs_url='/docs',
    redoc_url=None
)

# app.add_middleware(SessionMiddleware, secret_key=settings.AUTH_SECRET_KEY)

app.include_router(information_thinker, tags = ["Thinker"])
app.include_router(diagnosis_assistant, tags = ["Assistant"])

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

# @app.on_event("startup")
# async def app_init():
#     """
#         initialize crucial application services
#     """
#     db_client = AsyncIOMotorClient(settings.MONGO_CONNECTION_STRING).Visions

#     await init_beanie(
#         database = db_client,
#         document_models = [DeepLearning, TrainStore]


F = TypeVar("F", bound=Callable[..., Any])

@app.middleware("http")
async def process_time_log_middleware(request: Request, call_next: F) -> Response:
    """
    Add API process time in response headers and log calls
    """
    start_time = time.time()
    response: Response = await call_next(request)
    process_time = str(round(time.time() - start_time, 3))
    response.headers["X-Process-Time"] = process_time

    # logger.info(
    #     "Method=%s Path=%s StatusCode=%s ProcessTime=%s",
    #     request.method,
    #     request.url.path,
    #     response.status_code,
    #     process_time,
    # )
    
    return response

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app", 
        host=host, 
        port=port, 
        log_level="debug", 
        # workers=os.cpu_count(), 
        reload=True,
    )
