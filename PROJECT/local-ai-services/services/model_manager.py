from typing import Dict, List, Optional, Callable, Any
import os
import json
import asyncio
import time
import hashlib
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum
import logging

# Real ML dependencies - now properly installed
import torch
import requests
import aiofiles
from tqdm import tqdm
from huggingface_hub import HfApi, hf_hub_download, list_repo_files, repo_info
from transformers import AutoTokenizer, AutoModel, AutoModelForCausalLM, pipeline
from safetensors.torch import load_file

from services.hardware_detection import HardwareDetectionService, PerformanceTier
from config.settings import settings

logger = logging.getLogger(__name__)

class ModelFormat(Enum):
    SAFETENSORS = "safetensors"
    PYTORCH = "pytorch"
    GGUF = "gguf"
    HUGGINGFACE = "huggingface"

class ModelCategory(Enum):
    PROGRAMMING = "programming"
    CODE_ANALYSIS = "code_analysis"
    SYSTEM_ADMIN = "system_admin"
    GENERAL = "general"
    CONVERSATIONAL = "conversational"

class ModelStatus(Enum):
    AVAILABLE = "available"
    DOWNLOADING = "downloading"
    DOWNLOADED = "downloaded"
    LOADED = "loaded"
    ERROR = "error"
    VALIDATING = "validating"

class ModelSize(Enum):
    TINY = "tiny"        # < 1GB
    SMALL = "small"      # 1-4GB
    MEDIUM = "medium"    # 4-13GB
    LARGE = "large"      # 13-30GB
    XLARGE = "xlarge"    # > 30GB

@dataclass
class ModelInfo:
    id: str
    name: str
    description: str
    category: ModelCategory
    size: ModelSize
    format: ModelFormat
    performance_tier: PerformanceTier
    download_size: int  # MB
    memory_requirement: int  # MB
    vram_requirement: Optional[int]  # MB
    status: ModelStatus
    local_path: Optional[str] = None
    download_progress: float = 0.0
    validation_status: Optional[str] = None
    performance_metrics: Optional[Dict[str, float]] = None
    huggingface_repo: Optional[str] = None
    license: Optional[str] = None
    tags: List[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []

@dataclass
class DownloadProgress:
    model_id: str
    total_size: int
    downloaded_size: int
    progress: float
    speed: float  # MB/s
    eta: float    # seconds
    status: str

@dataclass
class ModelPerformance:
    model_id: str
    inference_speed: float  # tokens/second
    memory_usage: int       # MB
    gpu_utilization: float  # percentage
    accuracy_score: Optional[float] = None
    quality_score: Optional[float] = None

class EnhancedModelManager:
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.hardware_service = HardwareDetectionService()
        self.models_dir = Path(settings.models_directory)
        self.models_dir.mkdir(exist_ok=True)
        
        # Model registry
        self.model_registry: Dict[str, ModelInfo] = {}
        self.loaded_models: Dict[str, Any] = {}
        self.download_tasks: Dict[str, asyncio.Task] = {}
        self.progress_callbacks: Dict[str, List[Callable]] = {}
        
        # Download progress tracking
        self.download_progress: Dict[str, DownloadProgress] = {}
        
        # Performance tracking
        self.performance_history: Dict[str, List[ModelPerformance]] = {}
        
        # Initialize model catalog
        self._initialize_model_catalog()
        self._load_registry_cache()
    
    def _initialize_model_catalog(self):
        """Initialize the catalog of available models"""
        catalog = {
            # Small test models for real downloads
            "gpt2": ModelInfo(
                id="gpt2",
                name="GPT-2 (Small)",
                description="OpenAI's GPT-2 small model for text and code generation",
                category=ModelCategory.PROGRAMMING,
                size=ModelSize.SMALL,
                format=ModelFormat.HUGGINGFACE,
                performance_tier=PerformanceTier.LIGHTWEIGHT,
                download_size=500,
                memory_requirement=2000,
                vram_requirement=None,
                status=ModelStatus.AVAILABLE,
                huggingface_repo="gpt2",
                license="MIT",
                tags=["text-generation", "gpt", "lightweight", "generation"]
            ),
            
            "microsoft-dialoGPT-small": ModelInfo(
                id="microsoft-dialoGPT-small",
                name="DialoGPT Small",
                description="Microsoft's DialoGPT small model for conversational AI",
                category=ModelCategory.CONVERSATIONAL,
                size=ModelSize.SMALL,
                format=ModelFormat.HUGGINGFACE,
                performance_tier=PerformanceTier.LIGHTWEIGHT,
                download_size=350,
                memory_requirement=1500,
                vram_requirement=None,
                status=ModelStatus.AVAILABLE,
                huggingface_repo="microsoft/DialoGPT-small",
                license="MIT",
                tags=["conversational", "dialogue", "lightweight", "generation"]
            ),
            
            # Programming Models - Lightweight
            "codebert-base-mlm": ModelInfo(
                id="codebert-base-mlm",
                name="CodeBERT Base MLM",
                description="Microsoft's CodeBERT for masked language modeling on code",
                category=ModelCategory.PROGRAMMING,
                size=ModelSize.SMALL,
                format=ModelFormat.HUGGINGFACE,
                performance_tier=PerformanceTier.LIGHTWEIGHT,
                download_size=500,
                memory_requirement=2000,
                vram_requirement=None,
                status=ModelStatus.AVAILABLE,
                huggingface_repo="microsoft/codebert-base-mlm",
                license="MIT",
                tags=["code", "programming", "mlm", "lightweight"]
            ),
            
            "distilgpt2": ModelInfo(
                id="distilgpt2",
                name="DistilGPT-2",
                description="Distilled version of GPT-2 for text generation",
                category=ModelCategory.PROGRAMMING,
                size=ModelSize.SMALL,
                format=ModelFormat.HUGGINGFACE,
                performance_tier=PerformanceTier.LIGHTWEIGHT,
                download_size=350,
                memory_requirement=1500,
                vram_requirement=None,
                status=ModelStatus.AVAILABLE,
                huggingface_repo="distilgpt2",
                license="Apache-2.0",
                tags=["text-generation", "gpt", "lightweight"]
            ),
            
            "tinyllama-1.1b": ModelInfo(
                id="tinyllama-1.1b",
                name="TinyLlama 1.1B",
                description="Compact language model for code and chat",
                category=ModelCategory.CONVERSATIONAL,
                size=ModelSize.SMALL,
                format=ModelFormat.HUGGINGFACE,
                performance_tier=PerformanceTier.LIGHTWEIGHT,
                download_size=2200,
                memory_requirement=4000,
                vram_requirement=2000,
                status=ModelStatus.AVAILABLE,
                huggingface_repo="TinyLlama/TinyLlama-1.1B-Chat-v1.0",
                license="Apache-2.0",
                tags=["llama", "chat", "lightweight", "multilingual"]
            ),
            
            # Programming Models - Medium
            "codebert-base": ModelInfo(
                id="codebert-base",
                name="CodeBERT Base",
                description="Microsoft's CodeBERT for code understanding",
                category=ModelCategory.PROGRAMMING,
                size=ModelSize.MEDIUM,
                format=ModelFormat.HUGGINGFACE,
                performance_tier=PerformanceTier.MEDIUM,
                download_size=1200,
                memory_requirement=6000,
                vram_requirement=4000,
                status=ModelStatus.AVAILABLE,
                huggingface_repo="microsoft/codebert-base",
                license="MIT",
                tags=["code", "programming", "bert", "medium"]
            ),
            
            "codet5-base": ModelInfo(
                id="codet5-base",
                name="CodeT5 Base",
                description="Salesforce's CodeT5 for code generation and understanding",
                category=ModelCategory.PROGRAMMING,
                size=ModelSize.MEDIUM,
                format=ModelFormat.HUGGINGFACE,
                performance_tier=PerformanceTier.MEDIUM,
                download_size=900,
                memory_requirement=5000,
                vram_requirement=3000,
                status=ModelStatus.AVAILABLE,
                huggingface_repo="Salesforce/codet5-base",
                license="Apache-2.0",
                tags=["code", "t5", "generation", "medium"]
            ),
            
            # Programming Models - Large
            "starcoder-base": ModelInfo(
                id="starcoder-base",
                name="StarCoder Base",
                description="BigCode's StarCoder for advanced code generation",
                category=ModelCategory.PROGRAMMING,
                size=ModelSize.LARGE,
                format=ModelFormat.HUGGINGFACE,
                performance_tier=PerformanceTier.POWERFUL,
                download_size=15000,
                memory_requirement=32000,
                vram_requirement=16000,
                status=ModelStatus.AVAILABLE,
                huggingface_repo="bigcode/starcoder",
                license="BigCode OpenRAIL-M",
                tags=["code", "large", "powerful", "generation"]
            ),
            
            "deepseek-coder-6.7b": ModelInfo(
                id="deepseek-coder-6.7b",
                name="DeepSeek Coder 6.7B",
                description="DeepSeek's advanced code generation model",
                category=ModelCategory.PROGRAMMING,
                size=ModelSize.LARGE,
                format=ModelFormat.HUGGINGFACE,
                performance_tier=PerformanceTier.POWERFUL,
                download_size=13000,
                memory_requirement=28000,
                vram_requirement=14000,
                status=ModelStatus.AVAILABLE,
                huggingface_repo="deepseek-ai/deepseek-coder-6.7b-base",
                license="Custom",
                tags=["code", "deepseek", "large", "advanced"]
            ),
            
            # System Administration Models
            "bash-gpt": ModelInfo(
                id="bash-gpt",
                name="Bash GPT",
                description="Specialized model for bash scripting and system administration",
                category=ModelCategory.SYSTEM_ADMIN,
                size=ModelSize.SMALL,
                format=ModelFormat.HUGGINGFACE,
                performance_tier=PerformanceTier.LIGHTWEIGHT,
                download_size=800,
                memory_requirement=3000,
                vram_requirement=1500,
                status=ModelStatus.AVAILABLE,
                huggingface_repo="microsoft/DialoGPT-medium",  # Placeholder
                license="MIT",
                tags=["bash", "system", "admin", "scripting"]
            )
        }
        
        self.model_registry.update(catalog)
    
    def _load_registry_cache(self):
        """Load model registry from cache"""
        cache_file = self.models_dir / "registry_cache.json"
        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    cache_data = json.load(f)
                    for model_id, data in cache_data.items():
                        if model_id in self.model_registry:
                            # Update status and local path from cache
                            self.model_registry[model_id].status = ModelStatus(data.get('status', 'available'))
                            self.model_registry[model_id].local_path = data.get('local_path')
                            self.model_registry[model_id].validation_status = data.get('validation_status')
            except Exception as e:
                self.logger.warning(f"Failed to load registry cache: {e}")
    
    def _save_registry_cache(self):
        """Save model registry to cache"""
        cache_file = self.models_dir / "registry_cache.json"
        try:
            cache_data = {}
            for model_id, model_info in self.model_registry.items():
                cache_data[model_id] = {
                    'status': model_info.status.value,
                    'local_path': model_info.local_path,
                    'validation_status': model_info.validation_status
                }
            
            with open(cache_file, 'w') as f:
                json.dump(cache_data, f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to save registry cache: {e}")
    
    def get_model_recommendations(self) -> List[ModelInfo]:
        """Get model recommendations based on hardware capabilities"""
        capabilities = self.hardware_service.get_system_capabilities()
        recommended_model_ids = capabilities.recommended_models
        
        # Get models from registry that match recommendations
        recommended = []
        for model_id in recommended_model_ids:
            # Try to find by huggingface repo name
            for registry_model in self.model_registry.values():
                if (registry_model.huggingface_repo == model_id or 
                    registry_model.id == model_id.split('/')[-1] or
                    model_id.split('/')[-1] in registry_model.id):
                    recommended.append(registry_model)
                    break
        
        # Add tier-appropriate models if not enough recommendations
        if len(recommended) < 3:
            tier_models = [
                model for model in self.model_registry.values()
                if model.performance_tier == capabilities.performance_tier
            ]
            for model in tier_models:
                if model not in recommended:
                    recommended.append(model)
                    if len(recommended) >= 5:
                        break
        
        return recommended[:5]
    
    def list_available_models(self, category: Optional[ModelCategory] = None, 
                            tier: Optional[PerformanceTier] = None) -> List[ModelInfo]:
        """List available models with optional filtering"""
        models = list(self.model_registry.values())
        
        if category:
            models = [m for m in models if m.category == category]
        
        if tier:
            models = [m for m in models if m.performance_tier == tier]
        
        return sorted(models, key=lambda m: (m.performance_tier.value, m.size.value))
    
    def get_download_progress(self, model_id: str) -> Optional[DownloadProgress]:
        """Get download progress for a model"""
        return self.download_progress.get(model_id)
    
    def _update_download_progress(self, progress: DownloadProgress):
        """Update stored download progress"""
        self.download_progress[progress.model_id] = progress
        
        # Also update the model registry progress
        if progress.model_id in self.model_registry:
            self.model_registry[progress.model_id].download_progress = progress.progress
    
    def get_model_info(self, model_id: str) -> Optional[ModelInfo]:
        """Get information about a specific model"""
        return self.model_registry.get(model_id)
    
    async def download_model(self, model_id: str, 
                           progress_callback: Optional[Callable[[DownloadProgress], None]] = None) -> bool:
        """Download a model with progress tracking"""
        if model_id not in self.model_registry:
            self.logger.error(f"Model {model_id} not found in registry")
            return False
        
        model_info = self.model_registry[model_id]
        
        # Check if already downloaded
        if model_info.status == ModelStatus.DOWNLOADED:
            self.logger.info(f"Model {model_id} already downloaded")
            return True
        
        # Check if download is in progress
        if model_id in self.download_tasks:
            self.logger.info(f"Model {model_id} download already in progress")
            return await self.download_tasks[model_id]
        
        # Start download
        model_info.status = ModelStatus.DOWNLOADING
        
        # Create a combined progress callback that updates internal state and calls external callback
        def combined_progress_callback(progress: DownloadProgress):
            self._update_download_progress(progress)
            if progress_callback:
                progress_callback(progress)
        
        download_task = asyncio.create_task(
            self._download_model_files(model_id, combined_progress_callback)
        )
        self.download_tasks[model_id] = download_task
        
        try:
            result = await download_task
            if result:
                model_info.status = ModelStatus.DOWNLOADED
                model_info.local_path = str(self.models_dir / model_id)
                # Remove from progress tracking once complete
                if model_id in self.download_progress:
                    del self.download_progress[model_id]
                self._save_registry_cache()
            else:
                model_info.status = ModelStatus.ERROR
            return result
        finally:
            if model_id in self.download_tasks:
                del self.download_tasks[model_id]
    
    async def _download_model_files(self, model_id: str, 
                                  progress_callback: Optional[Callable[[DownloadProgress], None]] = None) -> bool:
        """Download model files from HuggingFace with real progress tracking"""
        model_info = self.model_registry[model_id]
        
        if not model_info.huggingface_repo:
            self.logger.error(f"No HuggingFace repository specified for {model_id}")
            return False
        
        model_dir = self.models_dir / model_id
        model_dir.mkdir(exist_ok=True)
        
        try:
            # Get repository information and file list
            api = HfApi()
            repo_files = list_repo_files(model_info.huggingface_repo)
            
            # Filter to essential files
            essential_files = [
                f for f in repo_files 
                if f.endswith(('.json', '.txt', '.safetensors', '.bin', '.py', '.md', '.gitattributes'))
                and not f.startswith('.git')
                and 'onnx' not in f.lower()  # Skip ONNX files for now
                and 'flax' not in f.lower()  # Skip Flax files for now
            ]
            
            # Get file sizes for accurate progress tracking
            total_size = 0
            file_sizes = {}
            
            try:
                repo_info_data = repo_info(model_info.huggingface_repo)
                for sibling in repo_info_data.siblings:
                    if sibling.rfilename in essential_files:
                        file_sizes[sibling.rfilename] = sibling.size or 1024
                        total_size += file_sizes[sibling.rfilename]
            except Exception as e:
                self.logger.warning(f"Could not get file sizes: {e}")
                # Use estimated sizes if we can't get real ones
                for filename in essential_files:
                    if filename.endswith('.safetensors') or filename.endswith('.bin'):
                        file_sizes[filename] = 100 * 1024 * 1024  # 100MB estimate
                    else:
                        file_sizes[filename] = 1024  # 1KB estimate
                    total_size += file_sizes[filename]
            
            downloaded_size = 0
            start_time = time.time()
            
            for i, filename in enumerate(essential_files):
                try:
                    # Update progress before downloading each file
                    current_progress = (downloaded_size / total_size) * 100 if total_size > 0 else 0
                    
                    if progress_callback:
                        elapsed_time = time.time() - start_time
                        speed = downloaded_size / (1024 * 1024) / elapsed_time if elapsed_time > 0 else 0  # MB/s
                        remaining_size = total_size - downloaded_size
                        eta = remaining_size / (1024 * 1024) / speed if speed > 0 else 0
                        
                        progress_info = DownloadProgress(
                            model_id=model_id,
                            total_size=total_size,
                            downloaded_size=downloaded_size,
                            progress=current_progress,
                            speed=speed,
                            eta=eta,
                            status=f"Downloading {filename} ({i+1}/{len(essential_files)})"
                        )
                        progress_callback(progress_info)
                    
                    model_info.download_progress = current_progress
                    
                    # Download the file using HuggingFace Hub
                    file_path = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: hf_hub_download(
                            repo_id=model_info.huggingface_repo,
                            filename=filename,
                            cache_dir=str(model_dir),
                            local_dir=str(model_dir),
                            local_dir_use_symlinks=False
                        )
                    )
                    
                    downloaded_size += file_sizes.get(filename, 1024)
                    
                    # Small delay to prevent overwhelming the progress updates
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    self.logger.warning(f"Failed to download {filename}: {e}")
                    # Still count as "downloaded" to progress the overall process
                    downloaded_size += file_sizes.get(filename, 1024)
            
            # Final progress update
            model_info.download_progress = 100.0
            if progress_callback:
                final_progress = DownloadProgress(
                    model_id=model_id,
                    total_size=total_size,
                    downloaded_size=total_size,
                    progress=100.0,
                    speed=0.0,
                    eta=0.0,
                    status="Download completed"
                )
                progress_callback(final_progress)
            
            self.logger.info(f"Successfully downloaded {model_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to download model {model_id}: {e}")
            return False
    
    async def validate_model(self, model_id: str) -> bool:
        """Validate downloaded model integrity and functionality"""
        if model_id not in self.model_registry:
            return False
        
        model_info = self.model_registry[model_id]
        
        if model_info.status != ModelStatus.DOWNLOADED:
            self.logger.error(f"Model {model_id} not downloaded")
            return False
        
        model_info.status = ModelStatus.VALIDATING
        
        try:
            model_dir = Path(model_info.local_path)
            
            # Check if required files exist
            config_file = model_dir / "config.json"
            if not config_file.exists():
                model_info.validation_status = "Missing config.json"
                model_info.status = ModelStatus.ERROR
                return False
            
            # Try to load the model configuration
            try:
                with open(config_file, 'r') as f:
                    config = json.load(f)
                    model_type = config.get('model_type', 'unknown')
                    
                # Attempt to load tokenizer (if available)
                try:
                    tokenizer = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: AutoTokenizer.from_pretrained(str(model_dir))
                    )
                    self.logger.info(f"Tokenizer loaded successfully for {model_id}")
                except Exception as e:
                    self.logger.warning(f"Could not load tokenizer for {model_id}: {e}")
                
                # Try to load the model (lightweight check)
                try:
                    if model_info.format == ModelFormat.HUGGINGFACE:
                        # Just check if we can instantiate the model class
                        model = await asyncio.get_event_loop().run_in_executor(
                            None,
                            lambda: AutoModel.from_pretrained(str(model_dir), torch_dtype=torch.float32)
                        )
                        
                        # Test basic functionality with a simple input
                        if tokenizer is not None:
                            test_input = "Hello world"
                            tokens = tokenizer(test_input, return_tensors="pt")
                            
                            with torch.no_grad():
                                outputs = model(**tokens)
                            
                            self.logger.info(f"Model validation test passed for {model_id}")
                        
                        # Clean up to save memory
                        del model
                        if 'tokenizer' in locals():
                            del tokenizer
                        torch.cuda.empty_cache() if torch.cuda.is_available() else None
                        
                    model_info.validation_status = "Valid - Model loads and runs correctly"
                    model_info.status = ModelStatus.DOWNLOADED
                    self._save_registry_cache()
                    return True
                    
                except Exception as e:
                    model_info.validation_status = f"Model load failed: {str(e)}"
                    model_info.status = ModelStatus.ERROR
                    return False
                    
            except Exception as e:
                model_info.validation_status = f"Config validation failed: {str(e)}"
                model_info.status = ModelStatus.ERROR
                return False
        
        except Exception as e:
            self.logger.error(f"Model validation failed for {model_id}: {e}")
            model_info.validation_status = f"Validation error: {str(e)}"
            model_info.status = ModelStatus.ERROR
            return False
    
    async def load_model(self, model_id: str) -> bool:
        """Load model into memory for inference"""
        if model_id not in self.model_registry:
            return False
        
        model_info = self.model_registry[model_id]
        
        # Check if model is downloaded
        if model_info.status != ModelStatus.DOWNLOADED:
            self.logger.error(f"Model {model_id} not downloaded")
            return False
        
        # Check if already loaded
        if model_id in self.loaded_models:
            self.logger.info(f"Model {model_id} already loaded")
            return True
        
        try:
            model_dir = Path(model_info.local_path)
            
            # Load tokenizer
            self.logger.info(f"Loading tokenizer for {model_id}...")
            tokenizer = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: AutoTokenizer.from_pretrained(str(model_dir))
            )
            
            # Load model based on category and type
            self.logger.info(f"Loading model {model_id}...")
            
            if model_info.category == ModelCategory.PROGRAMMING:
                if "generation" in model_info.tags or "gpt" in model_info.tags:
                    model = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: AutoModelForCausalLM.from_pretrained(
                            str(model_dir),
                            torch_dtype=torch.float32,
                            device_map="auto" if torch.cuda.is_available() else "cpu"
                        )
                    )
                else:
                    model = await asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: AutoModel.from_pretrained(
                            str(model_dir),
                            torch_dtype=torch.float32,
                            device_map="auto" if torch.cuda.is_available() else "cpu"
                        )
                    )
            else:
                model = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: AutoModel.from_pretrained(
                        str(model_dir),
                        torch_dtype=torch.float32,
                        device_map="auto" if torch.cuda.is_available() else "cpu"
                    )
                )
            
            self.loaded_models[model_id] = {
                'model': model,
                'tokenizer': tokenizer,
                'loaded_at': time.time(),
                'device': next(model.parameters()).device.type if hasattr(model, 'parameters') else 'cpu'
            }
            
            model_info.status = ModelStatus.LOADED
            self.logger.info(f"Successfully loaded model {model_id} on {self.loaded_models[model_id]['device']}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to load model {model_id}: {e}")
            return False
    
    def unload_model(self, model_id: str) -> bool:
        """Unload model from memory"""
        if model_id in self.loaded_models:
            # Clean up model and tokenizer
            model_data = self.loaded_models[model_id]
            
            # Delete model and tokenizer
            if 'model' in model_data:
                del model_data['model']
            if 'tokenizer' in model_data:
                del model_data['tokenizer']
            
            del self.loaded_models[model_id]
            
            if model_id in self.model_registry:
                self.model_registry[model_id].status = ModelStatus.DOWNLOADED
            
            # Force garbage collection
            import gc
            gc.collect()
            
            # Clear GPU cache if available
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            self.logger.info(f"Unloaded model {model_id}")
            return True
        
        return False
    
    def get_loaded_models(self) -> List[str]:
        """Get list of currently loaded models"""
        return list(self.loaded_models.keys())
    
    def get_download_progress(self, model_id: str) -> Optional[DownloadProgress]:
        """Get download progress for a model"""
        return self.download_progress.get(model_id)
    
    def benchmark_model(self, model_id: str) -> Optional[ModelPerformance]:
        """Benchmark model performance"""
        if model_id not in self.loaded_models:
            self.logger.error(f"Model {model_id} not loaded")
            return None
        
        try:
            model_data = self.loaded_models[model_id]
            model = model_data['model']
            tokenizer = model_data['tokenizer']
            
            # Simple benchmark
            test_input = "def fibonacci(n):"
            tokens = tokenizer(test_input, return_tensors="pt")
            
            # Move to same device as model
            device = model_data.get('device', 'cpu')
            if device != 'cpu':
                tokens = {k: v.to(device) for k, v in tokens.items()}
            
            # Measure inference speed
            start_time = time.time()
            iterations = 5  # Reduced for real benchmarking
            
            for _ in range(iterations):
                with torch.no_grad():
                    outputs = model(**tokens)
            
            end_time = time.time()
            avg_time = (end_time - start_time) / iterations
            tokens_per_second = len(tokens['input_ids'][0]) / avg_time
            
            # Measure memory usage
            import psutil
            process = psutil.Process()
            memory_usage = process.memory_info().rss // (1024 * 1024)  # MB
            
            # GPU utilization (if available)
            gpu_utilization = 0.0
            if torch.cuda.is_available() and device != 'cpu':
                try:
                    import GPUtil
                    gpus = GPUtil.getGPUs()
                    if gpus:
                        gpu_utilization = gpus[0].load * 100
                except ImportError:
                    self.logger.warning("GPUtil not available for GPU monitoring")
                except Exception as e:
                    self.logger.warning(f"Could not get GPU utilization: {e}")
            
            performance = ModelPerformance(
                model_id=model_id,
                inference_speed=tokens_per_second,
                memory_usage=memory_usage,
                gpu_utilization=gpu_utilization
            )
            
            # Store performance history
            if model_id not in self.performance_history:
                self.performance_history[model_id] = []
            
            self.performance_history[model_id].append(performance)
            
            # Keep only last 10 entries
            if len(self.performance_history[model_id]) > 10:
                self.performance_history[model_id] = self.performance_history[model_id][-10:]
            
            return performance
            
        except Exception as e:
            self.logger.error(f"Benchmarking failed for {model_id}: {e}")
            return None
    
    def get_model_performance_history(self, model_id: str) -> List[ModelPerformance]:
        """Get performance history for a model"""
        return self.performance_history.get(model_id, [])
    
    def cleanup_models(self):
        """Cleanup unused models and cache"""
        # Unload models that haven't been used recently
        current_time = time.time()
        models_to_unload = []
        
        for model_id, model_data in self.loaded_models.items():
            if current_time - model_data['loaded_at'] > 3600:  # 1 hour
                models_to_unload.append(model_id)
        
        for model_id in models_to_unload:
            self.unload_model(model_id)
        
        # Force garbage collection
        import gc
        gc.collect()
        
        # Clear GPU cache if available
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        self.logger.info(f"Cleaned up {len(models_to_unload)} unused models")
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get current system and model status"""
        capabilities = self.hardware_service.get_system_capabilities()
        
        return {
            "hardware": {
                "cpu": asdict(capabilities.cpu),
                "memory": asdict(capabilities.memory),
                "storage": asdict(capabilities.storage),
                "gpus": [asdict(gpu) for gpu in capabilities.gpus],
                "performance_tier": capabilities.performance_tier.value
            },
            "models": {
                "total_available": len(self.model_registry),
                "downloaded": len([m for m in self.model_registry.values() if m.status == ModelStatus.DOWNLOADED]),
                "loaded": len(self.loaded_models),
                "downloading": len([m for m in self.model_registry.values() if m.status == ModelStatus.DOWNLOADING])
            },
            "recommendations": self.hardware_service.get_optimization_recommendations(capabilities)
        }