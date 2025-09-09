from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum

# Hardware Detection Models
class PerformanceTierModel(str, Enum):
    LIGHTWEIGHT = "lightweight"
    MEDIUM = "medium"
    POWERFUL = "powerful"

class GPUVendorModel(str, Enum):
    NVIDIA = "nvidia"
    AMD = "amd"
    INTEL = "intel"
    UNKNOWN = "unknown"

class CPUInfoModel(BaseModel):
    name: str
    cores: int
    threads: int
    frequency: float
    architecture: str
    vendor: str
    performance_score: int

class GPUInfoModel(BaseModel):
    name: str
    vendor: GPUVendorModel
    memory_total: int
    memory_free: int
    compute_capability: Optional[str] = None
    driver_version: Optional[str] = None
    cuda_support: bool = False
    opencl_support: bool = False

class MemoryInfoModel(BaseModel):
    total: int
    available: int
    usage_percent: float

class StorageInfoModel(BaseModel):
    total: int
    free: int
    type: str

class SystemCapabilitiesModel(BaseModel):
    cpu: CPUInfoModel
    memory: MemoryInfoModel
    storage: StorageInfoModel
    gpus: List[GPUInfoModel]
    performance_tier: PerformanceTierModel
    recommended_models: List[str]
    os_info: Dict[str, str]

# Model Management Models
class ModelFormatModel(str, Enum):
    SAFETENSORS = "safetensors"
    PYTORCH = "pytorch"
    GGUF = "gguf"
    HUGGINGFACE = "huggingface"

class ModelCategoryModel(str, Enum):
    PROGRAMMING = "programming"
    CODE_ANALYSIS = "code_analysis"
    SYSTEM_ADMIN = "system_admin"
    GENERAL = "general"
    CONVERSATIONAL = "conversational"

class ModelStatusModel(str, Enum):
    AVAILABLE = "available"
    DOWNLOADING = "downloading"
    DOWNLOADED = "downloaded"
    LOADED = "loaded"
    ERROR = "error"
    VALIDATING = "validating"

class ModelSizeModel(str, Enum):
    TINY = "tiny"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    XLARGE = "xlarge"

class ModelInfoModel(BaseModel):
    id: str
    name: str
    description: str
    category: ModelCategoryModel
    size: ModelSizeModel
    format: ModelFormatModel
    performance_tier: PerformanceTierModel
    download_size: int
    memory_requirement: int
    vram_requirement: Optional[int] = None
    status: ModelStatusModel
    local_path: Optional[str] = None
    download_progress: float = 0.0
    validation_status: Optional[str] = None
    performance_metrics: Optional[Dict[str, float]] = None
    huggingface_repo: Optional[str] = None
    license: Optional[str] = None
    tags: List[str] = []

class DownloadProgressModel(BaseModel):
    model_id: str
    total_size: int
    downloaded_size: int
    progress: float
    speed: float
    eta: float
    status: str

class ModelPerformanceModel(BaseModel):
    model_id: str
    inference_speed: float
    memory_usage: int
    gpu_utilization: float
    accuracy_score: Optional[float] = None
    quality_score: Optional[float] = None

# Performance Monitoring Models
class SystemMetricsModel(BaseModel):
    timestamp: float
    cpu_percent: float
    memory_percent: float
    memory_used: int
    memory_total: int
    disk_percent: float
    disk_used: int
    disk_total: int
    network_sent: int
    network_recv: int
    gpu_utilization: Optional[float] = None
    gpu_memory_used: Optional[int] = None
    gpu_memory_total: Optional[int] = None
    temperature: Optional[float] = None

class ProcessInfoModel(BaseModel):
    pid: int
    name: str
    cpu_percent: float
    memory_percent: float
    memory_mb: float
    status: str
    create_time: str
    cmdline: List[str]

class SystemAlertModel(BaseModel):
    level: str
    component: str
    message: str
    timestamp: float
    value: Optional[float] = None
    threshold: Optional[float] = None

# System Administration Models
class TaskResultModel(BaseModel):
    success: bool
    message: str
    output: Optional[str] = None
    error: Optional[str] = None
    exit_code: Optional[int] = None

class SystemServiceModel(BaseModel):
    name: str
    status: str
    enabled: bool
    description: str

class MountPointModel(BaseModel):
    device: str
    mountpoint: str
    fstype: str
    opts: str
    size: str
    used: str
    available: str
    use_percent: str

# Request Models
class ModelDownloadRequest(BaseModel):
    model_id: str

class ModelLoadRequest(BaseModel):
    model_id: str

class ModelUnloadRequest(BaseModel):
    model_id: str

class CodeGenerationRequest(BaseModel):
    model_id: str
    prompt: str
    max_length: int = 200
    temperature: float = 0.7
    top_p: float = 0.9
    num_return_sequences: int = 1

class CodeAnalysisRequest(BaseModel):
    model_id: str
    code: str
    analysis_type: str = "quality"  # quality, security, performance

class SystemCommandRequest(BaseModel):
    command: str
    timeout: int = 30
    require_sudo: bool = False

class ServiceManagementRequest(BaseModel):
    action: str  # start, stop, restart, enable, disable
    service_name: str

class PackageManagementRequest(BaseModel):
    action: str  # install, remove, update, search
    package_name: str

class MountRequest(BaseModel):
    device: str
    mountpoint: str
    fstype: str = "auto"
    options: str = "defaults"

class UnmountRequest(BaseModel):
    mountpoint: str
    force: bool = False

class AlertThresholdUpdate(BaseModel):
    thresholds: Dict[str, float]

# Response Models
class CodeGenerationResponse(BaseModel):
    generated_code: List[str]
    model_id: str
    execution_time: float
    tokens_generated: int

class CodeAnalysisResponse(BaseModel):
    analysis_results: Dict[str, Any]
    model_id: str
    execution_time: float
    suggestions: List[str]

class HealthResponse(BaseModel):
    status: str
    timestamp: float
    services: Dict[str, str]
    system_metrics: SystemMetricsModel
    loaded_models: List[str]
    alerts: List[SystemAlertModel]

class SystemStatusResponse(BaseModel):
    hardware: Dict[str, Any]
    models: Dict[str, Any]
    recommendations: Dict[str, str]

class DiagnosticResponse(BaseModel):
    timestamp: str
    system_info: Dict[str, Any]
    disk_usage: List[Dict[str, Any]]
    memory_info: Dict[str, Any]
    network_status: Dict[str, Any]
    service_status: List[Dict[str, Any]]
    issues_found: List[str]