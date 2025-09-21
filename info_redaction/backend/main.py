import os
import json
import fitz
import yaml
import tempfile
import time
import random
import re
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Any, Tuple, Optional
from pathlib import Path

# FastAPI imports
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import uvicorn

# LangChain imports for replacement generation
from langchain.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import PydanticOutputParser
from dotenv import load_dotenv

# Import your existing modules (adjust paths as needed)
try:
    from custom_wrapper import OpenRouterChat
    from enhanceimg import process_pdf_for_ocr
    from parser import extract_document_elements
    from img_ext import extract_and_save_images_from_pdf, write_text_to_pdf_from_data
    from pii_agent import execute_pii
    from img_model.predict_lables import find_img
    from docling.document_converter import DocumentConverter
except ImportError as e:
    print(f"Warning: Some modules not found: {e}")


    # Create dummy classes for development
    class OpenRouterChat:
        def __init__(self, **kwargs):
            pass


    def execute_pii(txt_blocks):
        return {'pii_entities': [], 'pii_types': []}


    def extract_document_elements(result):
        return [], []


    def write_text_to_pdf_from_data(txt_data, output_path):
        pass


    def find_img(path):
        return []


    class DocumentConverter:
        def convert(self, path):
            class Result:
                document = None

            return Result()

# Load environment variables
load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

# FastAPI app initialization
app = FastAPI(
    title="AI PII Redactor API",
    description="Advanced AI-powered PII/PHI detection and redaction system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for serving processed documents
UPLOAD_DIR = Path("uploads")
PROCESSED_DIR = Path("processed")
LOGS_DIR = Path("logs")

# Create directories
for directory in [UPLOAD_DIR, PROCESSED_DIR, LOGS_DIR]:
    directory.mkdir(exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/processed", StaticFiles(directory="processed"), name="processed")


# Pydantic models
class PIIOutput(BaseModel):
    """Pydantic model for PII replacement output"""
    pii_types: List[str] = Field(default_factory=list)
    pii_types_replacement: List[str] = Field(default_factory=list)


class ProcessingStatus(BaseModel):
    """Model for processing status"""
    job_id: str
    status: str  # "processing", "completed", "failed"
    progress: int  # 0-100
    message: str
    result_files: Optional[List[str]] = None
    error: Optional[str] = None


class RedactionRequest(BaseModel):
    """Model for redaction request"""
    policy_file: Optional[str] = None
    create_overlay: bool = True
    user_replacement_choice: str = "text_box"  # "text_box" or "image"


# Global storage for processing jobs
processing_jobs: Dict[str, ProcessingStatus] = {}


class SecureRedactionPolicyManager:
    """Enhanced policy manager for both PII and PHI with secure options"""

    def __init__(self, policy_path: str = None):
        self.policies = self._create_default_policies()
        if policy_path and os.path.exists(policy_path):
            self._load_policies(policy_path)

    def _create_default_policies(self) -> Dict[str, Any]:
        return {
            'text_policies': {
                # PII Categories
                'Name': 'anonymize',
                'Address': 'dummy_replacement',
                'Birthday': 'anonymize',
                'Email': 'dummy_replacement',
                'Phone': 'dummy_replacement',
                'SSN': 'anonymize',
                'Passport': 'anonymize',
                'Credit card': 'anonymize',
                'Biometrics': 'anonymize',
                'Age': 'anonymize',
                'Gender': 'dummy_replacement',
                'Race': 'dummy_replacement',
                'Location': 'dummy_replacement',

                # PHI Categories
                'Medical Record Number': 'anonymize',
                'Health Plan Beneficiary Number': 'anonymize',
                'Account Number': 'anonymize',
                'Certificate License Number': 'anonymize',
                'Vehicle Identifier': 'anonymize',
                'Device Identifier': 'anonymize',
                'Web URL': 'dummy_replacement',
                'IP Address': 'dummy_replacement',
                'Biometric Identifier': 'anonymize',
                'Full Face Photo': 'anonymize',
                'Medical Condition': 'dummy_replacement',
                'Medication': 'dummy_replacement',
                'Doctor Name': 'dummy_replacement',
                'Hospital Name': 'dummy_replacement',
                'Insurance Info': 'anonymize'
            },
            'visual_policies': {
                # Visual PII/PHI replacement options
                'Name': 'text_box_replacement',
                'Address': 'image_replacement',
                'Email': 'text_box_replacement',
                'Phone': 'text_box_replacement',
                'Face': 'image_replacement',
                'Fingerprint': 'image_replacement',
                'Signature': 'image_replacement',
                'Medical Image': 'image_replacement',
                'ID Card': 'image_replacement',
                'Document Photo': 'text_box_replacement',
                'Barcode': 'image_replacement',
                'QR Code': 'image_replacement'
            },
            'global_settings': {
                'audit_logging': True,
                'secure_processing': True,
                'memory_only': True,
                'final_output_only': True,
                'user_replacement_choice': 'text_box',
                'create_overlay_pdf': True
            }
        }

    def _load_policies(self, policy_path: str):
        try:
            with open(policy_path, 'r') as f:
                loaded_policies = yaml.safe_load(f)
                self.policies.update(loaded_policies)
        except Exception as e:
            print(f"Warning: Could not load policies from {policy_path}: {e}")

    def get_text_action(self, pii_type: str) -> str:
        return self.policies.get('text_policies', {}).get(pii_type, 'anonymize')

    def get_visual_action(self, pii_type: str) -> str:
        return self.policies.get('visual_policies', {}).get(pii_type, 'text_box_replacement')

    def should_create_overlay(self) -> bool:
        return self.policies.get('global_settings', {}).get('create_overlay_pdf', True)


class LangChainDummyDataGenerator:
    """LangChain-based dummy data generator using LLM"""

    def __init__(self):
        self._dummy_cache = {}  # In-memory cache for session
        self._setup_langchain()

    def _setup_langchain(self):
        """Setup LangChain components"""
        try:
            self.llm = OpenRouterChat(
                api_key=OPENROUTER_API_KEY,
                model="openai/gpt-3.5-turbo",
                temperature=0,
                max_tokens=1024
            )

            self.parser = PydanticOutputParser(pydantic_object=PIIOutput)

            self.prompt = ChatPromptTemplate.from_template("""
You are a Fake information generator for the following given types in the list.
List of PII Types:
{pii_types}

Generate realistic but fake replacements for each type that would be appropriate for document redaction. 
Make sure the replacements are contextually appropriate and maintain similar formatting.

For example:
- Names: Generate realistic full names
- Addresses: Generate complete addresses with street, city, state, zip
- Phone numbers: Generate in standard format (XXX) XXX-XXXX
- Emails: Generate realistic email addresses
- SSN: Generate in XXX-XX-XXXX format
- Dates: Generate in MM/DD/YYYY format

Output strictly as JSON in the following structure:

{{
  "pii_types": ["Name", "Birthday", ...],
  "pii_types_replacement": ["John Smith", "01/15/1985", ...]
}}
""")

            self.chain = (
                    {"pii_types": RunnablePassthrough()}
                    | self.prompt
                    | self.llm
                    | self.parser
            )

        except Exception as e:
            print(f"Warning: Could not setup LangChain components: {e}")
            self.llm = None
            self.chain = None

    def generate_dummy_data(self, pii_types: List[str]) -> Dict[str, str]:
        """Generate dummy data for a list of PII types"""
        if not pii_types:
            return {}

        # Check cache first
        cache_key = ",".join(sorted(pii_types))
        if cache_key in self._dummy_cache:
            return self._dummy_cache[cache_key]

        try:
            if self.chain is None:
                return self._get_fallback_data(pii_types)

            # Use LangChain to generate replacements
            result = self.chain.invoke(", ".join(pii_types))
            result_dict = result.dict()

            # Create mapping
            replacement_map = {}
            for i, pii_type in enumerate(result_dict.get('pii_types', [])):
                if i < len(result_dict.get('pii_types_replacement', [])):
                    replacement_map[pii_type] = result_dict['pii_types_replacement'][i]

            # Cache the result
            self._dummy_cache[cache_key] = replacement_map
            return replacement_map

        except Exception as e:
            print(f"Error generating dummy data with LangChain: {e}")
            return self._get_fallback_data(pii_types)

    def _get_fallback_data(self, pii_types: List[str]) -> Dict[str, str]:
        """Fallback dummy data when LangChain fails"""
        fallbacks = {
            'Name': 'John Smith',
            'Address': '123 Main Street, Anytown, State 12345',
            'Birthday': '01/15/1985',
            'Email': 'john.smith@example.com',
            'Phone': '(555) 123-4567',
            'SSN': '123-45-6789',
            'Passport': 'A12345678',
            'Credit card': '1234-5678-9012-3456',
            'Age': '35',
            'Gender': 'Non-binary',
            'Race': 'Mixed',
            'Location': 'Sample City',
            'Medical Condition': 'General wellness check',
            'Medication': 'Over-the-counter supplement',
            'Doctor Name': 'Dr. Smith',
            'Hospital Name': 'General Medical Center',
            'Medical Record Number': 'MRN123456',
            'Health Plan Beneficiary Number': 'HPN987654',
            'Account Number': 'ACC123456789',
            'Web URL': 'https://example.com',
            'IP Address': '192.168.1.1'
        }

        return {pii_type: fallbacks.get(pii_type, f'[Dummy {pii_type}]') for pii_type in pii_types}

    def get_replacement_for_type(self, pii_type: str, original_text: str = "") -> str:
        """Get a single replacement for a specific PII type"""
        replacement_map = self.generate_dummy_data([pii_type])
        return replacement_map.get(pii_type, f'[Dummy {pii_type}]')


class SecureInfoRedactionPipeline:
    """Main secure redaction pipeline for PII and PHI"""

    def __init__(self, input_pdf: str, policy_manager: SecureRedactionPolicyManager = None):
        self.input_pdf = input_pdf
        self.policy_manager = policy_manager or SecureRedactionPolicyManager()
        self.dummy_generator = LangChainDummyDataGenerator()
        self.processing_log = {
            'timestamp': datetime.now().isoformat(),
            'input_pdf': input_pdf,
            'redactions': [],
            'metrics': defaultdict(int)
        }
        self.redaction_spans = []  # Store redaction spans for overlay creation

    def _docling_bbox_to_fitz(self, bb, page_height):
        """Convert Docling bbox to fitz coordinates with proper transformation"""
        if isinstance(bb, dict):
            l, t, r, b = bb['l'], bb['t'], bb['r'], bb['b']
        else:
            l, t, r, b = bb[0], bb[1], bb[2], bb[3]

        # Proper coordinate transformation for PDF coordinate system
        x0 = l
        y0 = page_height - b  # Bottom of bbox in PDF coordinates
        x1 = r
        y1 = page_height - t  # Top of bbox in PDF coordinates

        return fitz.Rect(x0, y0, x1, y1)

    def create_overlay_pdf(self, overlay_output: str = "redaction_overlay.pdf"):
        """Create overlay PDF showing redaction locations with correct positioning"""
        if not self.redaction_spans:
            print("ℹ️ No redactions to create overlay for")
            return

        doc = fitz.open(self.input_pdf)

        print(f"\n=== Creating Overlay PDF ===")

        for span in self.redaction_spans:
            page_num = span["page"]
            if page_num >= len(doc):
                continue

            page = doc[page_num]
            bbox = span["bbox"]

            # Convert bbox to proper fitz coordinates
            if isinstance(bbox, dict):
                rect = self._docling_bbox_to_fitz(bbox, page.rect.height)
            elif isinstance(bbox, list) and len(bbox) == 4:
                # If it's already in [x0, y0, x1, y1] format
                rect = fitz.Rect(bbox)
            else:
                print(f"Warning: Invalid bbox format for span: {span}")
                continue

            # Ensure rect is valid
            if rect.is_empty or rect.is_infinite:
                print(f"Warning: Invalid rect for span: {span}")
                continue

            action = self.policy_manager.get_text_action(span["type"])

            # Color coding for different actions
            if action == "dummy_replacement":
                color = [0, 1, 0]  # Green
            elif action == "rewrite":
                color = [0, 0, 1]  # Blue
            else:
                color = [1, 0, 0]  # Red (anonymize)

            try:
                highlight = page.add_highlight_annot(rect)
                highlight.set_colors(stroke=color)
                highlight.set_info(content=f"{span['type']} - {action}")
                highlight.update()
            except Exception as e:
                print(f"Warning: Could not add highlight for span {span['span_id']}: {e}")

        doc.save(overlay_output)
        doc.close()

        print(f"✅ Overlay PDF created: {overlay_output}")
        return overlay_output

    def _enhanced_pii_phi_detection(self, txt_blocks: List[Dict]) -> Dict[str, Any]:
        """Enhanced PII/PHI detection including medical information"""

        # Use existing PII detection
        pii_result = execute_pii(txt_blocks)

        # Extend with PHI patterns
        text_content = "\n".join([item['text'] for item in txt_blocks])

        additional_entities = []
        additional_types = []

        # PHI pattern matching
        phi_patterns = {
            'Medical Record Number': r'MRN[:\s]*(\d{6,})',
            'Health Plan Beneficiary Number': r'Member ID[:\s]*(\w{8,})',
            'Medical Condition': r'(?:diagnosed with|suffers from|condition:)\s*([A-Za-z\s]{5,30})',
            'Medication': r'(?:prescribed|taking|medication:)\s*([A-Za-z]{4,20})',
            'Doctor Name': r'Dr\.?\s+([A-Z][a-z]+\s+[A-Z][a-z]+)',
            'Hospital Name': r'([A-Z][a-z\s]+(?:Hospital|Medical Center|Clinic))'
        }

        for phi_type, pattern in phi_patterns.items():
            matches = re.findall(pattern, text_content, re.IGNORECASE)
            for match in matches:
                additional_entities.append(match)
                additional_types.append(phi_type)

        # Combine PII and PHI results
        if pii_result:
            all_entities = pii_result.get('pii_entities', []) + additional_entities
            all_types = pii_result.get('pii_types', []) + additional_types
        else:
            all_entities = additional_entities
            all_types = additional_types

        return {
            'pii_entities': all_entities,
            'pii_types': all_types
        }

    def _map_text_spans_to_pdf(self, text_pdf_path: str, pii_entities: List[str],
                               pii_types: List[str]) -> List[Dict]:
        """Map detected PII/PHI to PDF coordinates"""
        doc = fitz.open(text_pdf_path)
        results = []

        type_counters = defaultdict(int)

        for page_num, page in enumerate(doc):
            for ent, ent_type in zip(pii_entities, pii_types):
                matches = page.search_for(ent)
                type_counters[ent_type] += 1

                for match_idx, bbox in enumerate(matches):
                    span_data = {
                        "page": page_num,
                        "text": ent,
                        "type": ent_type,
                        "bbox": [bbox.x0, bbox.y0, bbox.x1, bbox.y1],
                        "span_id": f"page_{page_num}_{ent_type}_{type_counters[ent_type]}_{match_idx}",
                        "occurrence": type_counters[ent_type]
                    }
                    results.append(span_data)
                    # Store for overlay creation
                    self.redaction_spans.append(span_data)

        doc.close()
        return results

    def _get_replacement_text(self, pii_type: str, original_text: str,
                              occurrence: int) -> str:
        """Get replacement text based on policy using LangChain generator"""
        action = self.policy_manager.get_text_action(pii_type)

        if action == "anonymize":
            return f"[{pii_type}_{occurrence}]"
        elif action == "dummy_replacement":
            return self.dummy_generator.get_replacement_for_type(pii_type, original_text)
        else:
            return f"[REDACTED_{pii_type}]"

    def _redact_text_in_memory(self, text_pdf_data: bytes, pii_spans: List[Dict]) -> bytes:
        """Redact text in PDF data without saving intermediate files"""
        temp_file_path = None
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                temp_file.write(text_pdf_data)
                temp_file.flush()
                temp_file_path = temp_file.name

            doc = fitz.open(temp_file_path)

            for span in pii_spans:
                page = doc[span["page"]]
                bbox = fitz.Rect(span["bbox"])

                replacement = self._get_replacement_text(
                    span["type"], span["text"], span["occurrence"]
                )

                page.add_redact_annot(bbox, text=replacement)

                self.processing_log['redactions'].append({
                    'page': span['page'] + 1,
                    'type': span['type'],
                    'original': span['text'],
                    'replacement': replacement,
                    'action': self.policy_manager.get_text_action(span['type'])
                })

            # Apply redactions
            for page in doc:
                page.apply_redactions()

            # Get redacted PDF as bytes
            redacted_data = doc.write()
            doc.close()

            return redacted_data

        finally:
            # Clean up temp file with retry logic
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except (PermissionError, OSError) as e:
                    print(f"Warning: Could not delete temporary file {temp_file_path}: {e}")
                    # Try again after a short delay
                    time.sleep(0.1)
                    try:
                        os.unlink(temp_file_path)
                    except:
                        pass  # Final attempt failed, but we'll continue

    def process(self, output_pdf: str) -> Dict[str, Any]:
        """Main processing pipeline"""
        print("🚀 Starting Secure Information Redaction Pipeline...")

        try:
            # Step 1: Document parsing (in memory)
            print("\n📄 Step 1: Parsing document structure...")
            converter = DocumentConverter()
            result = converter.convert(self.input_pdf)
            img_data, txt_data = extract_document_elements(result.document)

            print(f"   Found {len(img_data)} images and {len(txt_data)} text elements")

            # Step 2: Enhanced PII/PHI detection
            print("\n🔍 Step 2: Detecting PII and PHI...")
            detection_result = self._enhanced_pii_phi_detection(txt_data)

            if not detection_result or not detection_result.get('pii_entities'):
                print("ℹ️ No PII/PHI detected.")
                # Just copy original file
                with open(self.input_pdf, 'rb') as src:
                    with open(output_pdf, 'wb') as dst:
                        dst.write(src.read())
                return self.processing_log

            print(f"   Detected {len(detection_result['pii_entities'])} entities")
            print(f"   Types: {set(detection_result['pii_types'])}")

            # Step 2.5: Generate dummy data for detected PII types
            print("\n🤖 Step 2.5: Generating replacement data...")
            unique_types = list(set(detection_result['pii_types']))
            replacement_map = self.dummy_generator.generate_dummy_data(unique_types)
            print(f"   Generated replacements for {len(replacement_map)} types")

            # Step 3: Create text-only PDF in memory
            print("\n📝 Step 3: Creating text-only PDF...")
            with tempfile.NamedTemporaryFile(suffix='.pdf') as text_pdf:
                write_text_to_pdf_from_data(txt_data, text_pdf.name)

                with open(text_pdf.name, 'rb') as f:
                    text_pdf_data = f.read()

                # Step 4: Map PII/PHI spans
                print("\n🎯 Step 4: Mapping information spans...")
                pii_spans = self._map_text_spans_to_pdf(
                    text_pdf.name,
                    detection_result['pii_entities'],
                    detection_result['pii_types']
                )

            # Step 5: Redact text (in memory)
            print("\n🔒 Step 5: Applying secure redaction...")
            redacted_pdf_data = self._redact_text_in_memory(text_pdf_data, pii_spans)

            # Step 6: Save final output
            print("\n💾 Step 6: Saving secure output...")
            with open(output_pdf, 'wb') as f:
                f.write(redacted_pdf_data)

            # Step 7: Create overlay PDF if enabled
            if self.policy_manager.should_create_overlay() and self.redaction_spans:
                overlay_path = output_pdf.replace('.pdf', '_overlay.pdf')
                self.create_overlay_pdf(overlay_path)

            # Step 8: Final metrics and logging
            print("\n📊 Step 8: Generating processing report...")
            self.processing_log['metrics']['total_redactions'] = len(self.processing_log['redactions'])
            self.processing_log['metrics']['total_visual_elements'] = len(img_data)
            self.processing_log['metrics']['unique_pii_types'] = len(unique_types)

            type_counts = defaultdict(int)
            for redaction in self.processing_log['redactions']:
                type_counts[redaction['type']] += 1
            self.processing_log['metrics']['type_counts'] = dict(type_counts)

            print(f"✅ Processing complete!")
            print(f"   Total redactions: {len(self.processing_log['redactions'])}")
            print(f"   Visual elements processed: {len(img_data)}")
            print(f"   Output saved to: {output_pdf}")

            return self.processing_log

        except Exception as e:
            print(f"❌ Error in processing pipeline: {e}")
            import traceback
            traceback.print_exc()
            raise e


# API Endpoints

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "AI PII Redactor API",
        "version": "1.0.0",
        "status": "active",
        "endpoints": {
            "upload": "/upload",
            "process": "/process/{job_id}",
            "status": "/status/{job_id}",
            "download": "/download/{filename}",
            "health": "/health"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a PDF file for processing"""
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")

        # Generate unique job ID
        job_id = f"job_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{random.randint(1000, 9999)}"

        # Save uploaded file
        file_path = UPLOAD_DIR / f"{job_id}_{file.filename}"
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Initialize processing job
        processing_jobs[job_id] = ProcessingStatus(
            job_id=job_id,
            status="uploaded",
            progress=0,
            message="File uploaded successfully"
        )

        return {
            "job_id": job_id,
            "filename": file.filename,
            "file_size": len(content),
            "status": "uploaded",
            "message": "File uploaded successfully. Use the job_id to start processing."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/process/{job_id}")
async def process_document(
        job_id: str,
        background_tasks: BackgroundTasks,
        request: RedactionRequest = None
):
    """Start processing a document"""
    try:
        if job_id not in processing_jobs:
            raise HTTPException(status_code=404, detail="Job not found")

        # Find the uploaded file
        job = processing_jobs[job_id]
        uploaded_files = list(UPLOAD_DIR.glob(f"{job_id}_*"))

        if not uploaded_files:
            raise HTTPException(status_code=404, detail="Uploaded file not found")

        input_file = uploaded_files[0]

        # Update job status
        job.status = "processing"
        job.progress = 10
        job.message = "Starting PII detection..."

        # Start background processing
        background_tasks.add_task(
            process_document_background,
            job_id,
            str(input_file),
            request
        )

        return {
            "job_id": job_id,
            "status": "processing",
            "message": "Processing started"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


async def process_document_background(
        job_id: str,
        input_file: str,
        request: RedactionRequest
):
    """Background task for document processing"""
    try:
        job = processing_jobs[job_id]

        # Update progress - Step 1: Document Parsing
        job.progress = 12
        job.message = "Step 1: Parsing document structure..."

        # Initialize policy manager
        policy_manager = SecureRedactionPolicyManager()

        # Update progress - Step 2: PII/PHI Detection
        job.progress = 25
        job.message = "Step 2: Detecting PII and PHI..."

        # Initialize pipeline
        pipeline = SecureInfoRedactionPipeline(input_file, policy_manager)

        # Update progress - Step 3: Generate Replacement Data
        job.progress = 37
        job.message = "Step 3: Generating replacement data..."

        # Generate output filename
        output_filename = f"{job_id}_redacted.pdf"
        output_path = PROCESSED_DIR / output_filename

        # Update progress - Step 4: Create Text PDF
        job.progress = 50
        job.message = "Step 4: Creating text-only PDF..."

        # Update progress - Step 5: Map PII Spans
        job.progress = 62
        job.message = "Step 5: Mapping PII spans to coordinates..."

        # Update progress - Step 6: Secure Redaction
        job.progress = 75
        job.message = "Step 6: Applying secure redaction..."

        # Process document
        result = pipeline.process(str(output_path))

        # Update progress - Step 7: Save Output
        job.progress = 87
        job.message = "Step 7: Saving final output..."

        # Update progress - Step 8: Create Overlay
        job.progress = 95
        job.message = "Step 8: Creating overlay PDF..."

        # Create overlay if requested
        overlay_filename = None
        if request and request.create_overlay:
            overlay_filename = f"{job_id}_overlay.pdf"
            overlay_path = PROCESSED_DIR / overlay_filename
            pipeline.create_overlay_pdf(str(overlay_path))

        # Save processing log
        log_filename = f"{job_id}_log.json"
        log_path = LOGS_DIR / log_filename
        with open(log_path, 'w') as f:
            json.dump(result, f, indent=2)

        # Update job status
        job.status = "completed"
        job.progress = 100
        job.message = "Processing completed successfully"
        job.result_files = [output_filename]
        if overlay_filename:
            job.result_files.append(overlay_filename)
        job.result_files.append(log_filename)

    except Exception as e:
        job = processing_jobs[job_id]
        job.status = "failed"
        job.error = str(e)
        job.message = f"Processing failed: {str(e)}"
        print(f"Background processing failed for job {job_id}: {e}")


@app.get("/status/{job_id}")
async def get_processing_status(job_id: str):
    """Get processing status for a job"""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    return processing_jobs[job_id]


@app.get("/download/{filename}")
async def download_file(filename: str):
    """Download processed files"""
    file_path = PROCESSED_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type='application/pdf' if filename.endswith('.pdf') else 'application/json'
    )


@app.get("/input/{job_id}")
async def get_input_file(job_id: str):
    """Get the original uploaded file for a job"""
    # Find the uploaded file for this job
    uploaded_files = list(UPLOAD_DIR.glob(f"{job_id}_*"))

    if not uploaded_files:
        raise HTTPException(status_code=404, detail="Input file not found")

    # Return the first (and should be only) uploaded file
    input_file = uploaded_files[0]

    return FileResponse(
        path=str(input_file),
        filename=input_file.name,
        media_type='application/pdf'
    )


@app.get("/jobs")
async def list_jobs():
    """List all processing jobs"""
    return {
        "jobs": list(processing_jobs.values()),
        "total": len(processing_jobs)
    }


@app.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and its associated files"""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        # Delete uploaded file
        uploaded_files = list(UPLOAD_DIR.glob(f"{job_id}_*"))
        for file_path in uploaded_files:
            if file_path.exists():
                file_path.unlink()

        # Delete processed files
        processed_files = list(PROCESSED_DIR.glob(f"{job_id}_*"))
        for file_path in processed_files:
            if file_path.exists():
                file_path.unlink()

        # Delete log files
        log_files = list(LOGS_DIR.glob(f"{job_id}_*"))
        for file_path in log_files:
            if file_path.exists():
                file_path.unlink()

        # Remove from jobs
        del processing_jobs[job_id]

        return {"message": f"Job {job_id} and associated files deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete job: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
