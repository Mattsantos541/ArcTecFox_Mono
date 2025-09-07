import os
import logging
import io
from typing import Optional
from supabase import create_client, Client
import PyPDF2
from docx import Document
from PIL import Image

logger = logging.getLogger(__name__)

class FileProcessor:
    def __init__(self):
        supabase_url = os.getenv("SUPABASE_URL")
        # Use service key for file processing to ensure sufficient permissions
        supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
        
        if not supabase_url or not supabase_key:
            logger.warning("⚠️ Supabase credentials not found - file processing will be disabled")
            self.supabase_client = None
        else:
            self.supabase_client: Client = create_client(supabase_url, supabase_key)
            logger.info("🔗 FileProcessor: Supabase client initialized with service key")

    async def extract_text_from_file(self, file_path: str, file_type: str) -> str:
        """Extract text content from uploaded files"""
        if not self.supabase_client:
            logger.warning("Supabase client not available for file processing")
            return ""
        
        try:
            # Download file from Supabase storage
            logger.info(f"🔽 Attempting to download from bucket 'user-manuals', path: '{file_path}'")
            logger.info(f"🔑 Using Supabase client with key type: {'SERVICE' if 'service' in str(type(self.supabase_client)) else 'ANON'}")
            
            # Test if we can access the bucket at all
            try:
                folder_path = file_path.split('/')[0] if '/' in file_path else ''
                if folder_path:
                    logger.info(f"🗂️ Testing folder access: {folder_path}")
                    folder_contents = self.supabase_client.storage.from_("user-manuals").list(folder_path)
                    logger.info(f"🗂️ Folder contents: {len(folder_contents) if folder_contents else 0} items")
            except Exception as list_error:
                logger.warning(f"🗂️ Could not list folder contents: {list_error}")
            
            response = self.supabase_client.storage.from_("user-manuals").download(file_path)
            
            if not response:
                logger.error(f"Failed to download file from path: {file_path}")
                return ""
            
            file_content = response
            
            # Process based on file type
            if file_type == "application/pdf":
                return self.extract_pdf_text(file_content)
            elif file_type in ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
                return self.extract_docx_text(file_content)
            elif file_type == "text/plain":
                return file_content.decode('utf-8')
            elif file_type.startswith("image/"):
                return self.extract_image_text(file_content)
            else:
                logger.warning(f"Unsupported file type: {file_type}")
                return ""
                
        except Exception as e:
            logger.error(f"Error extracting text from file {file_path}: {str(e)}")
            return ""

    def extract_pdf_text(self, file_content: bytes) -> str:
        """Extract text from PDF file"""
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text() + "\n"
            
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting PDF text: {str(e)}")
            return ""

    def extract_docx_text(self, file_content: bytes) -> str:
        """Extract text from DOCX file"""
        try:
            doc_file = io.BytesIO(file_content)
            doc = Document(doc_file)
            text = ""
            
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting DOCX text: {str(e)}")
            return ""

    def extract_image_text(self, file_content: bytes) -> str:
        """Extract text from image file using OCR (basic implementation)"""
        try:
            # For now, return a placeholder. In a production environment,
            # you would use OCR libraries like pytesseract or Google Vision API
            return "[Image content - text extraction not implemented]"
        except Exception as e:
            logger.error(f"Error extracting image text: {str(e)}")
            return ""

# Global instance
file_processor = FileProcessor()