#!/usr/bin/env python3

try:
    import torch
    print(f"✓ torch {torch.__version__} imported successfully")
except ImportError as e:
    print(f"✗ torch import failed: {e}")

try:
    import transformers
    print(f"✓ transformers {transformers.__version__} imported successfully")
except ImportError as e:
    print(f"✗ transformers import failed: {e}")

try:
    import huggingface_hub
    print(f"✓ huggingface_hub {huggingface_hub.__version__} imported successfully")
except ImportError as e:
    print(f"✗ huggingface_hub import failed: {e}")

try:
    from services.model_manager import EnhancedModelManager
    print("✓ EnhancedModelManager imported successfully")
except ImportError as e:
    print(f"✗ EnhancedModelManager import failed: {e}")

try:
    import fastapi
    print(f"✓ fastapi {fastapi.__version__} imported successfully")
except ImportError as e:
    print(f"✗ fastapi import failed: {e}")

print("\nAll critical imports tested.")