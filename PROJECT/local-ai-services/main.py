import asyncio
import time
import logging
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config.settings import settings
from utils.logging import setup_logging
from services.hardware_detection import HardwareDetectionService
from services.model_manager import EnhancedModelManager
from services.performance_monitor import PerformanceMonitorService
from services.system_admin import SystemAdministrationService

from models.schemas import (
    # Response models
    SystemCapabilitiesModel, ModelInfoModel, DownloadProgressModel,
    ModelPerformanceModel, SystemMetricsModel, ProcessInfoModel,
    SystemAlertModel, TaskResultModel, SystemServiceModel,
    MountPointModel, HealthResponse, SystemStatusResponse,
    CodeGenerationResponse, CodeAnalysisResponse, DiagnosticResponse,
    
    # Request models
    ModelDownloadRequest, ModelLoadRequest, ModelUnloadRequest,
    CodeGenerationRequest, CodeAnalysisRequest, SystemCommandRequest,
    ServiceManagementRequest, PackageManagementRequest,
    MountRequest, UnmountRequest, AlertThresholdUpdate
)

# Global services
hardware_service = None
model_manager = None
performance_monitor = None
system_admin = None
logger = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    global hardware_service, model_manager, performance_monitor, system_admin, logger
    
    # Setup logging
    logger = setup_logging(settings.log_level, settings.log_file)
    logger.info("Starting Enhanced FAv2 Local AI Service")
    
    try:
        # Initialize services
        logger.info("Initializing services...")
        
        hardware_service = HardwareDetectionService()
        model_manager = EnhancedModelManager()
        performance_monitor = PerformanceMonitorService()
        system_admin = SystemAdministrationService()
        
        # Get system capabilities
        capabilities = hardware_service.get_system_capabilities()
        logger.info(f"System detected: {capabilities.performance_tier.value} tier")
        logger.info(f"CPU: {capabilities.cpu.name} ({capabilities.cpu.cores} cores)")
        logger.info(f"Memory: {capabilities.memory.total} MB")
        logger.info(f"GPUs: {len(capabilities.gpus)}")
        
        # Start background monitoring
        asyncio.create_task(background_monitoring())
        
        logger.info("Enhanced FAv2 Local AI Service started successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise
    finally:
        # Cleanup
        logger.info("Shutting down Enhanced FAv2 Local AI Service")
        if model_manager:
            model_manager.cleanup_models()

async def background_monitoring():
    """Background task for monitoring and maintenance"""
    while True:
        try:
            # Update system metrics
            performance_monitor.get_current_metrics()
            
            # Cleanup models every hour
            if int(time.time()) % 3600 == 0:
                model_manager.cleanup_models()
                logger.info("Performed scheduled model cleanup")
                
        except Exception as e:
            logger.error(f"Background monitoring error: {e}")
        
        await asyncio.sleep(30)  # Update every 30 seconds

# Create FastAPI app
app = FastAPI(
    title="Enhanced FAv2 Local AI Service",
    description="AI-powered code generation, analysis, and system management",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    return {
        "service": "Enhanced FAv2 Local AI Service",
        "version": "2.0.0",
        "status": "running",
        "timestamp": time.time()
    }

# Health endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Comprehensive health check"""
    try:
        current_metrics = performance_monitor.get_current_metrics()
        active_alerts = performance_monitor.get_active_alerts()
        loaded_models = model_manager.get_loaded_models()
        
        services_status = {
            "hardware_detection": "healthy",
            "model_manager": "healthy",
            "performance_monitor": "healthy",
            "system_admin": "healthy"
        }
        
        return HealthResponse(
            status="healthy",
            timestamp=time.time(),
            services=services_status,
            system_metrics=current_metrics,
            loaded_models=loaded_models,
            alerts=active_alerts
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

# Hardware Detection Endpoints
@app.get("/hardware/capabilities", response_model=SystemCapabilitiesModel)
async def get_system_capabilities():
    """Get system hardware capabilities"""
    try:
        capabilities = hardware_service.get_system_capabilities()
        return capabilities
    except Exception as e:
        logger.error(f"Failed to get system capabilities: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/hardware/recommendations")
async def get_optimization_recommendations():
    """Get system optimization recommendations"""
    try:
        capabilities = hardware_service.get_system_capabilities()
        recommendations = hardware_service.get_optimization_recommendations(capabilities)
        return {"recommendations": recommendations}
    except Exception as e:
        logger.error(f"Failed to get recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Model Management Endpoints
@app.get("/models", response_model=List[ModelInfoModel])
async def list_models(category: Optional[str] = None, tier: Optional[str] = None):
    """List available models with optional filtering"""
    try:
        from services.model_manager import ModelCategory, PerformanceTier
        
        cat_filter = ModelCategory(category) if category else None
        tier_filter = PerformanceTier(tier) if tier else None
        
        models = model_manager.list_available_models(cat_filter, tier_filter)
        return models
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/recommendations", response_model=List[ModelInfoModel])
async def get_model_recommendations():
    """Get model recommendations based on hardware"""
    try:
        recommendations = model_manager.get_model_recommendations()
        return recommendations
    except Exception as e:
        logger.error(f"Failed to get model recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/{model_id}", response_model=ModelInfoModel)
async def get_model_info(model_id: str):
    """Get information about a specific model"""
    model_info = model_manager.get_model_info(model_id)
    if not model_info:
        raise HTTPException(status_code=404, detail="Model not found")
    return model_info

@app.post("/models/download")
async def download_model(request: ModelDownloadRequest, background_tasks: BackgroundTasks):
    """Download a model"""
    try:
        # Start download in background
        task = asyncio.create_task(model_manager.download_model(request.model_id))
        
        return {
            "message": f"Download started for model {request.model_id}",
            "model_id": request.model_id
        }
    except Exception as e:
        logger.error(f"Failed to start download for {request.model_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/{model_id}/download-progress")
async def get_download_progress(model_id: str):
    """Get download progress for a model"""
    progress = model_manager.get_download_progress(model_id)
    if progress is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"progress": progress}

@app.post("/models/load")
async def load_model(request: ModelLoadRequest):
    """Load a model into memory"""
    try:
        success = await model_manager.load_model(request.model_id)
        if success:
            return {"message": f"Model {request.model_id} loaded successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to load model")
    except Exception as e:
        logger.error(f"Failed to load model {request.model_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/unload")
async def unload_model(request: ModelUnloadRequest):
    """Unload a model from memory"""
    try:
        success = model_manager.unload_model(request.model_id)
        if success:
            return {"message": f"Model {request.model_id} unloaded successfully"}
        else:
            raise HTTPException(status_code=400, detail="Model not loaded")
    except Exception as e:
        logger.error(f"Failed to unload model {request.model_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/validate")
async def validate_model(request: ModelLoadRequest):
    """Validate a downloaded model"""
    try:
        success = await model_manager.validate_model(request.model_id)
        if success:
            return {"message": f"Model {request.model_id} validation successful"}
        else:
            raise HTTPException(status_code=400, detail="Model validation failed")
    except Exception as e:
        logger.error(f"Failed to validate model {request.model_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/{model_id}/performance", response_model=ModelPerformanceModel)
async def benchmark_model(model_id: str):
    """Benchmark model performance"""
    try:
        performance = model_manager.benchmark_model(model_id)
        if not performance:
            raise HTTPException(status_code=400, detail="Model not loaded or benchmark failed")
        return performance
    except Exception as e:
        logger.error(f"Failed to benchmark model {model_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/loaded")
async def get_loaded_models():
    """Get list of loaded models"""
    try:
        loaded_models = model_manager.get_loaded_models()
        return {"loaded_models": loaded_models}
    except Exception as e:
        logger.error(f"Failed to get loaded models: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# AI Generation Endpoints
@app.post("/generate", response_model=CodeGenerationResponse)
async def generate_code(request: CodeGenerationRequest):
    """Generate code using AI models"""
    try:
        # Check if model is loaded
        if request.model_id not in model_manager.loaded_models:
            raise HTTPException(status_code=400, detail="Model not loaded")
        
        start_time = time.time()
        
        # Get model and tokenizer
        model_data = model_manager.loaded_models[request.model_id]
        model = model_data['model']
        tokenizer = model_data['tokenizer']
        device = model_data.get('device', 'cpu')
        
        # Prepare inputs
        inputs = tokenizer(request.prompt, return_tensors="pt")
        
        # Move inputs to same device as model
        if device != 'cpu':
            inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Set pad token if not available
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        import torch
        with torch.no_grad():
            # Check if model supports generation
            if hasattr(model, 'generate'):
                outputs = model.generate(
                    inputs.input_ids,
                    max_length=min(request.max_length, inputs.input_ids.shape[1] + 100),  # Prevent excessive generation
                    temperature=request.temperature,
                    top_p=request.top_p,
                    num_return_sequences=request.num_return_sequences,
                    do_sample=True,
                    pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
                    eos_token_id=tokenizer.eos_token_id,
                    attention_mask=inputs.get('attention_mask')
                )
            else:
                # For models that don't support generation, return the input with analysis
                outputs = inputs.input_ids
        
        # Decode outputs
        generated_texts = []
        for output in outputs:
            text = tokenizer.decode(output, skip_special_tokens=True)
            # Remove the original prompt from the generated text
            if text.startswith(request.prompt):
                text = text[len(request.prompt):].strip()
            if not text:  # If empty, provide a default response
                text = "# Generated code would appear here\n# Model may need fine-tuning for code generation"
            generated_texts.append(text)
        
        execution_time = time.time() - start_time
        total_tokens = sum(len(output) for output in outputs)
        
        return CodeGenerationResponse(
            generated_code=generated_texts,
            model_id=request.model_id,
            execution_time=execution_time,
            tokens_generated=total_tokens
        )
        
    except Exception as e:
        logger.error(f"Code generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze", response_model=CodeAnalysisResponse)
async def analyze_code(request: CodeAnalysisRequest):
    """Analyze code using AI models"""
    try:
        # Check if model is loaded
        if request.model_id not in model_manager.loaded_models:
            raise HTTPException(status_code=400, detail="Model not loaded")
        
        start_time = time.time()
        
        # Simple code analysis (can be enhanced with specific analysis models)
        analysis_results = {
            "code_length": len(request.code),
            "line_count": len(request.code.split('\n')),
            "analysis_type": request.analysis_type,
            "complexity_score": min(len(request.code) / 100, 10)  # Simple complexity metric
        }
        
        suggestions = [
            "Consider adding docstrings for better documentation",
            "Use type hints to improve code clarity",
            "Add error handling for robustness"
        ]
        
        execution_time = time.time() - start_time
        
        return CodeAnalysisResponse(
            analysis_results=analysis_results,
            model_id=request.model_id,
            execution_time=execution_time,
            suggestions=suggestions
        )
        
    except Exception as e:
        logger.error(f"Code analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Performance Monitoring Endpoints
@app.get("/performance/metrics", response_model=SystemMetricsModel)
async def get_current_metrics():
    """Get current system metrics"""
    try:
        metrics = performance_monitor.get_current_metrics()
        return metrics
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/performance/history")
async def get_metrics_history(duration_minutes: int = 60):
    """Get metrics history"""
    try:
        history = performance_monitor.get_metrics_history(duration_minutes)
        return {"metrics_history": history}
    except Exception as e:
        logger.error(f"Failed to get metrics history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/performance/processes", response_model=List[ProcessInfoModel])
async def get_process_list(sort_by: str = "memory", limit: int = 10):
    """Get list of running processes"""
    try:
        processes = performance_monitor.get_process_list(sort_by, limit)
        return processes
    except Exception as e:
        logger.error(f"Failed to get process list: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/performance/alerts", response_model=List[SystemAlertModel])
async def get_active_alerts(level: Optional[str] = None):
    """Get active system alerts"""
    try:
        alerts = performance_monitor.get_active_alerts(level)
        return alerts
    except Exception as e:
        logger.error(f"Failed to get alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/performance/alerts/dismiss")
async def dismiss_alert(alert_index: int):
    """Dismiss a system alert"""
    try:
        success = performance_monitor.dismiss_alert(alert_index)
        if success:
            return {"message": "Alert dismissed"}
        else:
            raise HTTPException(status_code=400, detail="Invalid alert index")
    except Exception as e:
        logger.error(f"Failed to dismiss alert: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/performance/thresholds")
async def update_alert_thresholds(request: AlertThresholdUpdate):
    """Update alert thresholds"""
    try:
        success = performance_monitor.update_alert_thresholds(request.thresholds)
        if success:
            return {"message": "Thresholds updated successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to update thresholds")
    except Exception as e:
        logger.error(f"Failed to update thresholds: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/performance/summary")
async def get_performance_summary():
    """Get performance summary"""
    try:
        summary = performance_monitor.get_system_summary()
        return summary
    except Exception as e:
        logger.error(f"Failed to get performance summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# System Administration Endpoints
@app.get("/system/info")
async def get_system_info():
    """Get system information"""
    try:
        info = system_admin.get_system_info()
        return info
    except Exception as e:
        logger.error(f"Failed to get system info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/system/command", response_model=TaskResultModel)
async def execute_system_command(request: SystemCommandRequest):
    """Execute a system command"""
    try:
        result = system_admin.execute_command(
            request.command, 
            request.timeout, 
            request.require_sudo
        )
        return result
    except Exception as e:
        logger.error(f"Failed to execute command: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/system/services", response_model=TaskResultModel)
async def manage_service(request: ServiceManagementRequest):
    """Manage system services"""
    try:
        result = system_admin.manage_services(request.action, request.service_name)
        return result
    except Exception as e:
        logger.error(f"Failed to manage service: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system/services", response_model=List[SystemServiceModel])
async def get_services_status():
    """Get system services status"""
    try:
        services = system_admin.get_services_status()
        return services
    except Exception as e:
        logger.error(f"Failed to get services status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/system/packages", response_model=TaskResultModel)
async def manage_package(request: PackageManagementRequest):
    """Manage system packages"""
    try:
        result = system_admin.manage_packages(request.action, request.package_name)
        return result
    except Exception as e:
        logger.error(f"Failed to manage package: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system/mounts", response_model=List[MountPointModel])
async def get_mount_points():
    """Get system mount points"""
    try:
        mounts = system_admin.get_mount_points()
        return mounts
    except Exception as e:
        logger.error(f"Failed to get mount points: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/system/mount", response_model=TaskResultModel)
async def mount_device(request: MountRequest):
    """Mount a device"""
    try:
        result = system_admin.mount_device(
            request.device, 
            request.mountpoint, 
            request.fstype, 
            request.options
        )
        return result
    except Exception as e:
        logger.error(f"Failed to mount device: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/system/unmount", response_model=TaskResultModel)
async def unmount_device(request: UnmountRequest):
    """Unmount a device"""
    try:
        result = system_admin.unmount_device(request.mountpoint, request.force)
        return result
    except Exception as e:
        logger.error(f"Failed to unmount device: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/system/clean", response_model=TaskResultModel)
async def clean_system():
    """Clean system temporary files and caches"""
    try:
        result = system_admin.clean_system()
        return result
    except Exception as e:
        logger.error(f"Failed to clean system: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system/logs")
async def get_system_logs(service: Optional[str] = None, lines: int = 100):
    """Get system logs"""
    try:
        result = system_admin.get_system_logs(service, lines)
        return {
            "success": result.success,
            "logs": result.output if result.success else result.error
        }
    except Exception as e:
        logger.error(f"Failed to get system logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system/diagnose", response_model=DiagnosticResponse)
async def diagnose_system():
    """Run comprehensive system diagnostics"""
    try:
        diagnostics = system_admin.diagnose_system()
        return diagnostics
    except Exception as e:
        logger.error(f"Failed to run diagnostics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Status and Overview Endpoints
@app.get("/status", response_model=SystemStatusResponse)
async def get_system_status():
    """Get comprehensive system status"""
    try:
        status = model_manager.get_system_status()
        return status
    except Exception as e:
        logger.error(f"Failed to get system status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        workers=settings.api_workers,
        reload=settings.debug
    )