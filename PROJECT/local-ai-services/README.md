# Enhanced FAv2 Local AI Service

A comprehensive local AI assistant with advanced model management capabilities.

## Features

- **Hardware Detection**: Automatic CPU/GPU detection and capability assessment
- **Smart Model Recommendations**: Model suggestions based on hardware capabilities
- **Enhanced Model Management**: Download, validation, and performance monitoring
- **System Administration**: OS task automation and troubleshooting
- **Performance Monitoring**: Real-time system metrics and alerts

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Start the service:
```bash
python main.py
```

## API Endpoints

### Hardware Detection
- `GET /hardware/capabilities` - Get system hardware capabilities
- `GET /hardware/recommendations` - Get optimization recommendations

### Model Management
- `GET /models` - List available models
- `GET /models/recommendations` - Get recommended models
- `POST /models/download` - Download a model
- `POST /models/load` - Load model into memory
- `POST /models/unload` - Unload model from memory

### AI Generation
- `POST /generate` - Generate code using AI
- `POST /analyze` - Analyze code using AI

### Performance Monitoring
- `GET /performance/metrics` - Get current system metrics
- `GET /performance/history` - Get metrics history
- `GET /performance/alerts` - Get active alerts

### System Administration
- `GET /system/info` - Get system information
- `POST /system/command` - Execute system commands
- `POST /system/services` - Manage system services
- `GET /system/diagnose` - Run system diagnostics

## Configuration

Create a `.env` file with your configuration:

```env
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
ENABLE_GPU=true
MODELS_DIRECTORY=./models
```