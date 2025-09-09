from typing import Dict, List, Optional, Tuple
import platform
import psutil
import subprocess
import logging
from dataclasses import dataclass
from enum import Enum

try:
    import GPUtil
    import py3nvml.py3nvml as nvml
    GPU_AVAILABLE = True
except ImportError:
    GPU_AVAILABLE = False

try:
    import cpuinfo
    CPUINFO_AVAILABLE = True
except ImportError:
    CPUINFO_AVAILABLE = False

logger = logging.getLogger(__name__)

class PerformanceTier(Enum):
    LIGHTWEIGHT = "lightweight"
    MEDIUM = "medium"
    POWERFUL = "powerful"

class GPUVendor(Enum):
    NVIDIA = "nvidia"
    AMD = "amd"
    INTEL = "intel"
    UNKNOWN = "unknown"

@dataclass
class CPUInfo:
    name: str
    cores: int
    threads: int
    frequency: float
    architecture: str
    vendor: str
    performance_score: int

@dataclass
class GPUInfo:
    name: str
    vendor: GPUVendor
    memory_total: int  # MB
    memory_free: int   # MB
    compute_capability: Optional[str] = None
    driver_version: Optional[str] = None
    cuda_support: bool = False
    opencl_support: bool = False

@dataclass
class MemoryInfo:
    total: int  # MB
    available: int  # MB
    usage_percent: float

@dataclass
class StorageInfo:
    total: int  # GB
    free: int   # GB
    type: str   # SSD, HDD, etc.

@dataclass
class SystemCapabilities:
    cpu: CPUInfo
    memory: MemoryInfo
    storage: StorageInfo
    gpus: List[GPUInfo]
    performance_tier: PerformanceTier
    recommended_models: List[str]
    os_info: Dict[str, str]

class HardwareDetectionService:
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self._initialize_gpu()
    
    def _initialize_gpu(self):
        """Initialize GPU detection libraries"""
        if GPU_AVAILABLE:
            try:
                nvml.nvmlInit()
                self.nvml_initialized = True
            except Exception as e:
                self.logger.warning(f"NVML initialization failed: {e}")
                self.nvml_initialized = False
        else:
            self.nvml_initialized = False
    
    def detect_cpu(self) -> CPUInfo:
        """Detect CPU information and capabilities"""
        try:
            # Get basic CPU info
            cpu_count = psutil.cpu_count(logical=False)
            cpu_threads = psutil.cpu_count(logical=True)
            
            # Get CPU frequency
            freq_info = psutil.cpu_freq()
            frequency = freq_info.max if freq_info else 0.0
            
            # Get detailed CPU info if available
            if CPUINFO_AVAILABLE:
                info = cpuinfo.get_cpu_info()
                cpu_name = info.get('brand_raw', 'Unknown CPU')
                vendor = info.get('vendor_id_raw', 'Unknown')
                arch = info.get('arch_string_raw', platform.machine())
            else:
                cpu_name = platform.processor() or 'Unknown CPU'
                vendor = 'Unknown'
                arch = platform.machine()
            
            # Calculate performance score
            performance_score = self._calculate_cpu_performance_score(
                cpu_count, cpu_threads, frequency, cpu_name
            )
            
            return CPUInfo(
                name=cpu_name,
                cores=cpu_count,
                threads=cpu_threads,
                frequency=frequency,
                architecture=arch,
                vendor=vendor,
                performance_score=performance_score
            )
        
        except Exception as e:
            self.logger.error(f"CPU detection failed: {e}")
            return CPUInfo(
                name="Unknown CPU",
                cores=1,
                threads=1,
                frequency=0.0,
                architecture="unknown",
                vendor="unknown",
                performance_score=1
            )
    
    def detect_gpus(self) -> List[GPUInfo]:
        """Detect GPU information and capabilities"""
        gpus = []
        
        # Try NVIDIA GPUs first
        if self.nvml_initialized:
            try:
                device_count = nvml.nvmlDeviceGetCount()
                for i in range(device_count):
                    handle = nvml.nvmlDeviceGetHandleByIndex(i)
                    
                    # Get basic info
                    name = nvml.nvmlDeviceGetName(handle).decode('utf-8')
                    
                    # Get memory info
                    mem_info = nvml.nvmlDeviceGetMemoryInfo(handle)
                    memory_total = mem_info.total // (1024 * 1024)  # Convert to MB
                    memory_free = mem_info.free // (1024 * 1024)
                    
                    # Get compute capability
                    try:
                        major, minor = nvml.nvmlDeviceGetCudaComputeCapability(handle)
                        compute_capability = f"{major}.{minor}"
                    except:
                        compute_capability = None
                    
                    # Get driver version
                    try:
                        driver_version = nvml.nvmlSystemGetDriverVersion().decode('utf-8')
                    except:
                        driver_version = None
                    
                    gpu = GPUInfo(
                        name=name,
                        vendor=GPUVendor.NVIDIA,
                        memory_total=memory_total,
                        memory_free=memory_free,
                        compute_capability=compute_capability,
                        driver_version=driver_version,
                        cuda_support=True,
                        opencl_support=True
                    )
                    gpus.append(gpu)
            
            except Exception as e:
                self.logger.warning(f"NVIDIA GPU detection failed: {e}")
        
        # Try GPUtil as fallback
        if not gpus and GPU_AVAILABLE:
            try:
                gpu_list = GPUtil.getGPUs()
                for gpu in gpu_list:
                    gpu_info = GPUInfo(
                        name=gpu.name,
                        vendor=self._detect_gpu_vendor(gpu.name),
                        memory_total=int(gpu.memoryTotal),
                        memory_free=int(gpu.memoryFree),
                        cuda_support=True,  # Assume CUDA support if detected by GPUtil
                        opencl_support=True
                    )
                    gpus.append(gpu_info)
            
            except Exception as e:
                self.logger.warning(f"GPUtil detection failed: {e}")
        
        return gpus
    
    def detect_memory(self) -> MemoryInfo:
        """Detect system memory information"""
        try:
            mem = psutil.virtual_memory()
            return MemoryInfo(
                total=mem.total // (1024 * 1024),  # Convert to MB
                available=mem.available // (1024 * 1024),
                usage_percent=mem.percent
            )
        except Exception as e:
            self.logger.error(f"Memory detection failed: {e}")
            return MemoryInfo(total=0, available=0, usage_percent=100.0)
    
    def detect_storage(self) -> StorageInfo:
        """Detect storage information"""
        try:
            # Get disk usage for current directory
            disk_usage = psutil.disk_usage('.')
            
            # Try to detect storage type
            storage_type = self._detect_storage_type()
            
            return StorageInfo(
                total=disk_usage.total // (1024 * 1024 * 1024),  # Convert to GB
                free=disk_usage.free // (1024 * 1024 * 1024),
                type=storage_type
            )
        except Exception as e:
            self.logger.error(f"Storage detection failed: {e}")
            return StorageInfo(total=0, free=0, type="unknown")
    
    def get_system_capabilities(self) -> SystemCapabilities:
        """Get comprehensive system capabilities"""
        cpu = self.detect_cpu()
        memory = self.detect_memory()
        storage = self.detect_storage()
        gpus = self.detect_gpus()
        
        # Determine performance tier
        performance_tier = self._determine_performance_tier(cpu, memory, gpus)
        
        # Get recommended models
        recommended_models = self._get_recommended_models(performance_tier, memory, gpus)
        
        # Get OS info
        os_info = {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor()
        }
        
        return SystemCapabilities(
            cpu=cpu,
            memory=memory,
            storage=storage,
            gpus=gpus,
            performance_tier=performance_tier,
            recommended_models=recommended_models,
            os_info=os_info
        )
    
    def _calculate_cpu_performance_score(self, cores: int, threads: int, frequency: float, name: str) -> int:
        """Calculate CPU performance score (1-10)"""
        score = 1
        
        # Base score from cores
        if cores >= 16:
            score += 4
        elif cores >= 8:
            score += 3
        elif cores >= 4:
            score += 2
        elif cores >= 2:
            score += 1
        
        # Bonus for high frequency
        if frequency >= 4000:
            score += 2
        elif frequency >= 3000:
            score += 1
        
        # Bonus for known high-performance CPUs
        name_lower = name.lower()
        if any(x in name_lower for x in ['i9', 'ryzen 9', 'threadripper']):
            score += 2
        elif any(x in name_lower for x in ['i7', 'ryzen 7']):
            score += 1
        
        return min(score, 10)
    
    def _detect_gpu_vendor(self, gpu_name: str) -> GPUVendor:
        """Detect GPU vendor from name"""
        name_lower = gpu_name.lower()
        if 'nvidia' in name_lower or 'geforce' in name_lower or 'quadro' in name_lower or 'tesla' in name_lower:
            return GPUVendor.NVIDIA
        elif 'amd' in name_lower or 'radeon' in name_lower:
            return GPUVendor.AMD
        elif 'intel' in name_lower:
            return GPUVendor.INTEL
        else:
            return GPUVendor.UNKNOWN
    
    def _detect_storage_type(self) -> str:
        """Try to detect storage type (SSD vs HDD)"""
        try:
            if platform.system() == "Linux":
                # Try to detect SSD on Linux
                result = subprocess.run(
                    ['lsblk', '-d', '-o', 'name,rota'],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0 and '0' in result.stdout:
                    return "SSD"
                elif result.returncode == 0 and '1' in result.stdout:
                    return "HDD"
            elif platform.system() == "Darwin":  # macOS
                # Most modern Macs have SSDs
                return "SSD"
        except Exception:
            pass
        
        return "Unknown"
    
    def _determine_performance_tier(self, cpu: CPUInfo, memory: MemoryInfo, gpus: List[GPUInfo]) -> PerformanceTier:
        """Determine overall system performance tier"""
        # Check for powerful configuration
        has_powerful_gpu = any(
            gpu.memory_total >= 12000 and gpu.vendor == GPUVendor.NVIDIA 
            for gpu in gpus
        )
        
        if (cpu.performance_score >= 8 and 
            memory.total >= 32000 and 
            has_powerful_gpu):
            return PerformanceTier.POWERFUL
        
        # Check for medium configuration
        has_medium_gpu = any(
            gpu.memory_total >= 6000 and gpu.vendor == GPUVendor.NVIDIA 
            for gpu in gpus
        )
        
        if (cpu.performance_score >= 5 and 
            memory.total >= 16000 and 
            (has_medium_gpu or memory.total >= 24000)):
            return PerformanceTier.MEDIUM
        
        # Default to lightweight
        return PerformanceTier.LIGHTWEIGHT
    
    def _get_recommended_models(self, tier: PerformanceTier, memory: MemoryInfo, gpus: List[GPUInfo]) -> List[str]:
        """Get recommended models based on system capabilities"""
        if tier == PerformanceTier.POWERFUL:
            return [
                "microsoft/CodeBERT-base",
                "Salesforce/codet5-large",
                "bigcode/starcoder",
                "deepseek-ai/deepseek-coder-6.7b-base",
                "WizardLM/WizardCoder-15B-V1.0"
            ]
        elif tier == PerformanceTier.MEDIUM:
            return [
                "microsoft/CodeBERT-base",
                "Salesforce/codet5-base",
                "microsoft/codebert-base-mlm",
                "huggingface/CodeBERTa-small-v1",
                "microsoft/DialoGPT-medium"
            ]
        else:  # LIGHTWEIGHT
            return [
                "microsoft/codebert-base-mlm",
                "huggingface/CodeBERTa-small-v1", 
                "distilgpt2",
                "microsoft/DialoGPT-small",
                "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
            ]

    def get_optimization_recommendations(self, capabilities: SystemCapabilities) -> Dict[str, str]:
        """Get system optimization recommendations"""
        recommendations = {}
        
        # Memory recommendations
        if capabilities.memory.usage_percent > 80:
            recommendations['memory'] = "High memory usage detected. Consider closing other applications or upgrading RAM."
        elif capabilities.memory.total < 8000:
            recommendations['memory'] = "Low system memory. Consider upgrading to at least 16GB for better AI model performance."
        
        # GPU recommendations
        if not capabilities.gpus:
            recommendations['gpu'] = "No GPU detected. Consider adding an NVIDIA GPU for faster AI model inference."
        elif capabilities.gpus:
            best_gpu = max(capabilities.gpus, key=lambda g: g.memory_total)
            if best_gpu.memory_total < 6000:
                recommendations['gpu'] = "GPU has limited memory. Consider upgrading to a GPU with 8GB+ VRAM for larger models."
        
        # Storage recommendations
        if capabilities.storage.free < 50:
            recommendations['storage'] = "Low disk space. Ensure at least 50GB free space for model downloads."
        elif capabilities.storage.type == "HDD":
            recommendations['storage'] = "Consider upgrading to SSD for faster model loading and better performance."
        
        # CPU recommendations
        if capabilities.cpu.performance_score < 4:
            recommendations['cpu'] = "CPU performance may be limiting. Consider upgrading to a modern multi-core processor."
        
        return recommendations