// File text extraction utility for different file types
import * as pdfjsLib from 'pdfjs-dist';

// Detect if running in development environment (Codespaces, localhost, etc.)
const isDevelopmentEnvironment = () => {
  return window.location.hostname.includes('github.dev') ||
         window.location.hostname.includes('localhost') ||
         window.location.hostname.includes('127.0.0.1') ||
         import.meta.env.DEV;
};

// Set up PDF.js worker - use local worker for better reliability
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch (error) {
  // Silently handle worker setup issues in development
  if (isDevelopmentEnvironment()) {
    console.log('📄 PDF.js worker setup deferred (development environment)');
  }
}

/**
 * Extract readable text content from various file types
 * @param {File} file - The file to extract text from
 * @returns {Promise<string>} - The extracted text content
 */
export const extractTextFromFile = async (file) => {
  const fileName = file.name.toLowerCase();
  const fileExtension = fileName.substring(fileName.lastIndexOf('.'));

  try {
    switch (fileExtension) {
      case '.pdf':
        return await extractTextFromPDF(file);
      case '.txt':
        return await extractTextFromText(file);
      case '.doc':
      case '.docx':
        // For now, treat as text - could add proper DOC parsing later
        return await extractTextFromText(file);
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
        // For images, return filename and type info
        return `Image file: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB). Note: OCR text extraction from images is not yet implemented.`;
      default:
        return await extractTextFromText(file);
    }
  } catch (error) {
    if (isDevelopmentEnvironment()) {
      console.log('📄 Expected extraction limitation in development environment, using text fallback');
    } else {
      console.error('Error extracting text from file:', error);
    }
    // Fallback to basic text reading
    return await extractTextFromText(file);
  }
};

/**
 * Extract text from PDF files
 * @param {File} file - PDF file
 * @returns {Promise<string>} - Extracted text
 */
const extractTextFromPDF = async (file) => {
  // Check if we're in a development environment where PDF.js might not work properly
  if (isDevelopmentEnvironment()) {
    console.log('📄 Development environment detected - using fallback text extraction for PDF');
    console.log('📄 Note: PDF.js may not work reliably in Codespaces/development environments');

    // Try PDF.js first, but expect it might fail
    try {
      return await extractPDFWithLibrary(file);
    } catch (error) {
      console.log('📄 PDF.js extraction failed as expected in development environment, using text fallback');
      return await extractTextFromText(file);
    }
  } else {
    // Production environment - use PDF.js normally
    return await extractPDFWithLibrary(file);
  }
};

/**
 * Extract text using PDF.js library
 * @param {File} file - PDF file
 * @returns {Promise<string>} - Extracted text
 */
const extractPDFWithLibrary = async (file) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;

        let fullText = '';
        const maxPages = Math.min(pdf.numPages, 10); // Limit to first 10 pages

        console.log(`📄 PDF has ${pdf.numPages} pages, extracting from first ${maxPages} pages`);

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();

          const pageText = textContent.items
            .map(item => item.str)
            .join(' ')
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

          if (pageText) {
            fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
          }
        }

        // Clean up the text
        const cleanText = fullText
          .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
          .replace(/\s{3,}/g, ' ') // Remove excessive spaces
          .trim();

        console.log(`📄 Extracted ${cleanText.length} characters from PDF using PDF.js`);
        resolve(cleanText);

      } catch (error) {
        reject(error);
      }
    };

    fileReader.onerror = () => reject(new Error('Failed to read PDF file'));
    fileReader.readAsArrayBuffer(file);
  });
};

/**
 * Extract text from plain text files
 * @param {File} file - Text file
 * @returns {Promise<string>} - File content as text
 */
const extractTextFromText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;

      // Clean up the text content
      const cleanText = text
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
        .replace(/\s{3,}/g, ' ') // Remove excessive spaces
        .trim();

      console.log(`📄 Extracted ${cleanText.length} characters from text file`);
      resolve(cleanText);
    };

    reader.onerror = () => reject(new Error('Failed to read text file'));
    reader.readAsText(file, 'UTF-8');
  });
};

/**
 * Truncate text content to a reasonable size for API processing
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length in characters
 * @returns {string} - Truncated text
 */
export const truncateTextForAPI = (text, maxLength = 20000) => {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to truncate at a word boundary
  const truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  const result = lastSpaceIndex > maxLength * 0.8
    ? truncated.substring(0, lastSpaceIndex)
    : truncated;

  console.log(`📄 Truncated text from ${text.length} to ${result.length} characters`);
  return result;
};