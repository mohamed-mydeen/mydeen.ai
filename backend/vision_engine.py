import cv2
import numpy as np
import pytesseract
from PIL import Image
import io
from ultralytics import YOLO
import logging

logger = logging.getLogger(__name__)

# Load YOLOv8 model (nano version for speed/local processing)
try:
    yolo_model = YOLO('yolov8n.pt') 
except Exception as e:
    logger.warning(f"Could not load YOLO model: {e}")
    yolo_model = None

def preprocess_image(image_bytes):
    """Convert bytes to OpenCV format and perform basic optimization"""
    if not image_bytes:
        return None
        
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return None
        
    # Resize if too large
    max_dim = 1280
    h, w = img.shape[:2]
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img = cv2.resize(img, None, fx=scale, fy=scale)
    
    return img

def detect_text(img):
    """Extract text using Tesseract OCR"""
    if img is None:
        return ""
        
    try:
        # Check if tesseract is in PATH or installed
        # We try to call it; if it fails with TesseractNotFoundError, we catch it
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
        
        text = pytesseract.image_to_string(thresh)
        return text.strip()
    except Exception as e:
        # Soft fallback: Log the warning but don't crash. The system will use YOLO instead.
        logger.warning(f"OCR system not available or failed: {str(e)}")
        return ""

def detect_objects(img):
    """Detect objects using YOLOv8"""
    if yolo_model is None or img is None:
        return []
    
    try:
        results = yolo_model(img, verbose=False)
        detections = []
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                label = yolo_model.names[cls_id]
                conf = float(box.conf[0])
                if conf > 0.4:
                    detections.append(label)
        
        return list(set(detections))
    except Exception as e:
        logger.error(f"YOLO Exception: {str(e)}")
        return []

def analyze_vision_query(image_bytes):
    """
    Routes the image to OCR or YOLO and prepares a summary for Groq.
    """
    img = preprocess_image(image_bytes)
    if img is None:
        return {"error": "Invalid image format or corrupted file.", "has_content": False}
    
    # 1. Try OCR
    extracted_text = detect_text(img)
    
    # 2. Try Object Detection
    objects = detect_objects(img)
    
    # Check if OCR returned a specific error message
    error_msg = None
    if extracted_text.startswith("ERROR:"):
        error_msg = extracted_text
        extracted_text = ""

    # Logic to determine if it's primarily a document or an object
    is_document = len(extracted_text) > 20
    
    analysis_type = "text" if is_document else "object"
    
    summary = {
        "type": analysis_type,
        "ocr_text": extracted_text,
        "objects": objects,
        "has_content": bool(extracted_text or objects),
        "error": error_msg
    }
    
    return summary
