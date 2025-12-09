#!/usr/bin/env python3
"""
TrustMark Decoder CLI Wrapper
Detects TrustMark watermarks in images and outputs JSON results.

This script is called by the Node.js MCP server to perform watermark detection
using the Python TrustMark implementation.
"""

import sys
import json
from pathlib import Path

try:
    from trustmark import TrustMark
    from PIL import Image
except ImportError as e:
    print(json.dumps({
        "error": f"Missing dependency: {str(e)}. Install with: pip install trustmark Pillow",
        "success": False,
        "hasWatermark": False
    }))
    sys.exit(1)


def detect_watermark(image_path: str, model_type: str = 'P') -> dict:
    """
    Detect TrustMark watermark in an image.
    
    Args:
        image_path: Path to the image file
        model_type: TrustMark model type ('P' for production/standard, 'Q' for alternative)
    
    Returns:
        Dictionary with detection results
    """
    try:
        # Initialize TrustMark decoder
        tm = TrustMark(verbose=False, model_type=model_type)
        
        # Load image
        image = Image.open(image_path).convert('RGB')
        
        # Decode watermark
        wm_secret, wm_present, wm_schema = tm.decode(image)
        
        if wm_present and wm_secret:
            # Map schema number to name
            schema_map = {
                0: 'BCH_SUPER',
                1: 'BCH_5',
                2: 'BCH_4',
                3: 'BCH_3'
            }
            schema_name = schema_map.get(wm_schema, 'UNKNOWN')
            
            # Determine if identifier is a URL
            identifier = str(wm_secret)
            manifest_url = None
            if identifier.startswith('http://') or identifier.startswith('https://'):
                manifest_url = identifier
            
            return {
                "success": True,
                "hasWatermark": True,
                "watermarkData": {
                    "identifier": identifier,
                    "schema": schema_name,
                    "raw": identifier,
                    "manifestUrl": manifest_url
                }
            }
        else:
            return {
                "success": True,
                "hasWatermark": False
            }
            
    except FileNotFoundError:
        return {
            "success": False,
            "hasWatermark": False,
            "error": f"Image file not found: {image_path}"
        }
    except Exception as e:
        return {
            "success": False,
            "hasWatermark": False,
            "error": f"Watermark detection failed: {str(e)}"
        }


def main():
    """Main CLI entry point."""
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: trustmark-decode.py <image_path> [model_type]",
            "success": False,
            "hasWatermark": False
        }))
        sys.exit(1)
    
    image_path = sys.argv[1]
    model_type = sys.argv[2] if len(sys.argv) > 2 else 'P'
    
    result = detect_watermark(image_path, model_type)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()

