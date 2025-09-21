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

# LangChain imports for replacement generation
from langchain.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import PydanticOutputParser
from dotenv import load_dotenv
from custom_wrapper import OpenRouterChat
from pydantic import BaseModel, Field

# Import your existing modules
from enhanceimg import process_pdf_for_ocr
from parser import extract_document_elements
from img_ext import extract_and_save_images_from_pdf, write_text_to_pdf_from_data
from pii_agent import execute_pii
from img_model.predict_lables import find_img
from docling.document_converter import DocumentConverter

# Load environment variables
load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")


class PIIOutput(BaseModel):
    """Pydantic model for PII replacement output"""
    pii_types: List[str] = Field(default_factory=list)
    pii_types_replacement: List[str] = Field(default_factory=list)


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
                'user_replacement_choice': 'prompt',  # 'prompt', 'text_box', 'image'
                'create_overlay_pdf': True  # New setting for overlay PDF
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

        return fitz.Rect(x0, y0, x1, y1).normalize()

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

    def _process_visual_elements(self, redacted_pdf_data: bytes, img_data: List[Dict],
                                 user_choice: str) -> bytes:
        """Process visual elements based on user choice"""
        if not img_data:
            return redacted_pdf_data

        temp_input_path = None
        temp_output_path = None
        img_summary_path = None

        try:
            # Create temporary input file
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_input:
                temp_input.write(redacted_pdf_data)
                temp_input.flush()
                temp_input_path = temp_input.name

            # Create temporary output file path
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_output:
                temp_output_path = temp_output.name

            # Get image classifications
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as img_summary:
                self._create_image_summary_pdf(img_data, img_summary.name)
                img_summary_path = img_summary.name
                classifications = find_img(img_summary.name)

            # Process based on user choice
            if user_choice == "text_box":
                self._add_text_boxes(temp_input_path, temp_output_path,
                                     img_data, classifications)
            elif user_choice == "image":
                self._add_replacement_images(temp_input_path, temp_output_path,
                                             img_data, classifications)
            else:
                # Default to text boxes
                self._add_text_boxes(temp_input_path, temp_output_path,
                                     img_data, classifications)

            # Read final result
            with open(temp_output_path, 'rb') as f:
                final_data = f.read()

            return final_data

        finally:
            # Clean up temp files with retry logic
            for file_path in [temp_input_path, temp_output_path, img_summary_path]:
                if file_path and os.path.exists(file_path):
                    try:
                        os.unlink(file_path)
                    except (PermissionError, OSError):
                        # Try again after a short delay
                        time.sleep(0.1)
                        try:
                            os.unlink(file_path)
                        except:
                            pass  # Final attempt failed

    def _create_image_summary_pdf(self, img_data: List[Dict], output_path: str):
        """Create summary PDF for image classification"""
        doc = fitz.open(self.input_pdf)
        summary_doc = fitz.open()

        for img_info in img_data:
            page_num = img_info['page_no']
            bbox = img_info['bbox']

            if page_num < len(doc):
                source_page = doc[page_num]

                # Convert bbox to fitz rect with proper coordinates
                if isinstance(bbox, dict):
                    rect = self._docling_bbox_to_fitz(bbox, source_page.rect.height)
                else:
                    rect = fitz.Rect(bbox)

                # Create new page in summary
                summary_page = summary_doc.new_page(width=rect.width, height=rect.height)

                # Copy image area
                summary_page.show_pdf_page(
                    summary_page.rect,  # where to place the imported content
                    doc,  # source document
                    page_num,  # source page number
                    clip=rect  # area of the source page to copy
                )

        summary_doc.save(output_path)
        summary_doc.close()
        doc.close()

    def _add_text_boxes(self, input_pdf: str, output_pdf: str,
                        img_data: List[Dict], classifications: List):
        """Add text boxes for visual elements with correct positioning"""
        doc = fitz.open(input_pdf)

        for i, img_info in enumerate(img_data):
            if i < len(classifications) and classifications[i]:
                page_num = img_info['page_no']
                bbox_dict = img_info['bbox']

                if page_num < len(doc):
                    page = doc[page_num]
                    rect = self._docling_bbox_to_fitz(bbox_dict, page.rect.height)

                    class_name, confidence = classifications[i][0][0]
                    display_text = class_name.replace("_", " ").title()

                    # Store visual redaction for overlay
                    self.redaction_spans.append({
                        "page": page_num,
                        "text": f"Visual: {display_text}",
                        "type": "Visual Element",
                        "bbox": bbox_dict,
                        "span_id": f"visual_{page_num}_{i}",
                        "occurrence": i + 1
                    })

                    # Create text box
                    page.draw_rect(rect, color=(0, 0, 0), fill=(0, 0, 0))

                    # Add centered white text
                    font_size = min(12, rect.height * 0.6)
                    text_width = fitz.get_text_length(display_text, "helv", font_size)

                    if text_width < rect.width:
                        center_x = rect.x0 + (rect.width - text_width) / 2
                        center_y = rect.y0 + rect.height / 2

                        page.insert_text(
                            (center_x, center_y),
                            display_text,
                            fontsize=font_size,
                            color=(1, 1, 1),
                            fontname="helv"
                        )

        doc.save(output_pdf)
        doc.close()

    def _add_replacement_images(self, input_pdf: str, output_pdf: str,
                                img_data: List[Dict], classifications: List):
        """Add replacement images for visual elements"""
        doc = fitz.open(input_pdf)

        for i, img_info in enumerate(img_data):
            if i < len(classifications) and classifications[i]:
                page_num = img_info['page_no']
                bbox_dict = img_info['bbox']

                if page_num < len(doc):
                    page = doc[page_num]
                    rect = self._docling_bbox_to_fitz(bbox_dict, page.rect.height)

                    class_name, confidence = classifications[i][0][0]
                    display_text = class_name.replace("_", " ").title()

                    # Store visual redaction for overlay
                    self.redaction_spans.append({
                        "page": page_num,
                        "text": f"Visual: {display_text}",
                        "type": "Visual Element",
                        "bbox": bbox_dict,
                        "span_id": f"visual_{page_num}_{i}",
                        "occurrence": i + 1
                    })

                    # For now, fallback to text box since image replacement is complex
                    page.draw_rect(rect, color=(0.8, 0.8, 0.8), fill=(0.8, 0.8, 0.8))

        doc.save(output_pdf)
        doc.close()

    def _get_user_replacement_choice(self) -> str:
        """Get user choice for visual element replacement"""
        choice_mode = self.policy_manager.policies.get('global_settings', {}).get(
            'user_replacement_choice', 'prompt'
        )

        if choice_mode == 'prompt':
            print("\nVisual Element Replacement Options:")
            print("1. Text Box Replacement (faster)")
            print("2. Image Replacement (uses placeholder boxes)")

            while True:
                choice = input("Enter your choice (1 or 2): ").strip()
                if choice == "1":
                    return "text_box"
                elif choice == "2":
                    return "image"
                else:
                    print("Please enter 1 or 2")
        elif choice_mode == 'text_box':
            return "text_box"
        elif choice_mode == 'image':
            return "image"
        else:
            return "text_box"  # Default

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
            print(txt_data)
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

            # Step 6: Process visual elements if present
            if img_data:
                print("\n🖼️ Step 6: Processing visual elements...")
                user_choice = self._get_user_replacement_choice()
                final_pdf_data = self._process_visual_elements(
                    redacted_pdf_data, img_data, user_choice
                )
            else:
                final_pdf_data = redacted_pdf_data

            # Step 7: Save final output
            print("\n💾 Step 7: Saving secure output...")
            with open(output_pdf, 'wb') as f:
                f.write(final_pdf_data)

                # Step 8: Create overlay PDF if enabled
                if self.policy_manager.should_create_overlay() and self.redaction_spans:
                    overlay_path = output_pdf.replace('.pdf', '_overlay.pdf')
                    self.create_overlay_pdf(overlay_path)

                # Step 9: Final metrics and logging
                print("\n📊 Step 9: Generating processing report...")
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

                if self.policy_manager.should_create_overlay() and self.redaction_spans:
                    print(f"   Overlay PDF created: {overlay_path}")

                return self.processing_log
        except Exception as e:
            print(f"❌ Error in processing pipeline: {e}")
            import traceback
            traceback.print_exc()




    def save_processing_log(self, log_path: str = None):
        """Save processing log to JSON file"""
        if log_path is None:
            log_path = f"redaction_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        try:
            with open(log_path, 'w') as f:
                json.dump(self.processing_log, f, indent=2)
            print(f"✅ Processing log saved to: {log_path}")
            return log_path
        except Exception as e:
            print(f"❌ Error saving processing log: {e}")
            return None

def main():
    """Main function with predefined input variables"""
    # Predefined input parameters
    INPUT_PDF=r"test_pdf.pdf"
    #INPUT_PDF = r"C:\Users\abhiv\OneDrive\Desktop\Fake Data for Nasscom\Structured Data (PDF)\Carlos_E_Rodriguez.pdf"
    OUTPUT_PDF = "secure_redacted_output.pdf"
    POLICY_FILE = "redaction_policies.yaml"  # Optional
    LOG_FILE = "redaction_log.json"  # Optional

    try:
        # Validate input file
        if not os.path.exists(INPUT_PDF):
            print(f"❌ Error: Input file {INPUT_PDF} does not exist")
            return

        # Validate policy file if provided
        if POLICY_FILE and not os.path.exists(POLICY_FILE):
            print(f"❌ Warning: Policy file {POLICY_FILE} not found. Using default policies.")
            POLICY_FILE = None

        # Display settings
        print("=" * 60)
        print("🔐 SECURE PII/PHI REDACTION PIPELINE")
        print("=" * 60)
        print(f"Input PDF: {INPUT_PDF}")
        print(f"Output PDF: {OUTPUT_PDF}")
        print(f"Policy file: {POLICY_FILE if POLICY_FILE else 'Default policies'}")
        print(f"Log file: {LOG_FILE if LOG_FILE else 'Auto-generated'}")
        print("=" * 60)

        # Initialize policy manager
        policy_manager = SecureRedactionPolicyManager(
            POLICY_FILE) if POLICY_FILE else SecureRedactionPolicyManager()

        # Initialize and run pipeline
        print("\nStarting redaction process...")
        pipeline = SecureInfoRedactionPipeline(INPUT_PDF, policy_manager)
        result = pipeline.process(OUTPUT_PDF)

        # Save log
        if LOG_FILE:
            pipeline.save_processing_log(LOG_FILE)
        else:
            pipeline.save_processing_log()

        print("\n" + "=" * 60)
        print("PROCESSING COMPLETE!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
