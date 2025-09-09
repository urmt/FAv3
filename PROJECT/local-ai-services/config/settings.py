from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_workers: int = 1
    debug: bool = False
    
    # CORS Configuration
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]
    
    # Model Configuration
    models_directory: str = "./models"
    model_cache_size: int = 3  # Number of models to keep in memory
    default_model_format: str = "safetensors"
    
    # Hardware Configuration
    enable_gpu: bool = True
    gpu_memory_fraction: float = 0.8
    cpu_threads: int = 4
    
    # Download Configuration
    download_timeout: int = 3600  # 1 hour
    max_download_retries: int = 3
    download_chunk_size: int = 8192
    
    # Performance Configuration
    max_generation_length: int = 2048
    batch_size: int = 1
    temperature: float = 0.7
    top_p: float = 0.9
    
    # Logging Configuration
    log_level: str = "INFO"
    log_file: str = "ai_service.log"
    
    # Security Configuration
    allowed_model_sources: List[str] = [
        "huggingface.co",
        "hf.co"
    ]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()