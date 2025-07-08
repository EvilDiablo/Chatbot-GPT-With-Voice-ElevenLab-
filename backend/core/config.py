from typing import List
from decouple import config
from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Database
    # MONGO_CONNECTION_STRING: str = config("MONGO_CONNECTION_STRING", cast=str)
    
    # Azure credential details
    CLIENT_CREDENTIAL_ENDPOINT: str = config("AZURE_OPENAI_ENDPOINT")
    CLIENT_CREDENTIAL_KEY: str = config("AZURE_OPENAI_API_KEY")
    ASSISTANT_ID: str = config("ASSISTANT_ID")

    # Openai credential details
    OPENAI_CREDENTIAL_KEY: str = config("OPENAI_API_KEY")
    class Config:
        case_sensitive = True


settings = Settings()