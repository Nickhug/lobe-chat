import { jsPDF } from 'jspdf';

import { parseMarkdown } from '@/utils/parseMarkdown';

export const advancedMarkdownToPdf = async (
  markdownContent: string,
  title: string = 'document.pdf',
): Promise<Blob> => {
  try {
    // Parse markdown to HTML
    const htmlContent = await parseMarkdown(markdownContent);

    // Create a temporary DOM element to manipulate the HTML
    const tempDiv = document.createElement('div');
    // Wrap content in a container to better control styling and layout within the PDF
    tempDiv.innerHTML = `<div style="padding: 15px;">${htmlContent}</div>`;

    // Apply styles to the HTML elements for better PDF rendering
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      body, div {
        font-family: 'Helvetica', 'Arial', sans-serif; /* Added Arial as fallback */
        font-size: 10pt; /* Adjusted font size slightly */
        line-height: 1.6; /* Increased line-height for better readability */
        color: #333;
      }
      h1, h2, h3, h4, h5, h6 {
        margin-top: 1.2em;
        margin-bottom: 0.6em;
        font-weight: bold;
        color: #111; /* Slightly darker heading color */
        page-break-after: avoid; /* Avoid page breaks right after headings */
      }
      h1 { font-size: 18pt; }
      h2 { font-size: 16pt; }
      h3 { font-size: 14pt; }
      h4 { font-size: 12pt; }
      p { 
        margin-bottom: 0.8em; 
        text-align: justify; /* Justify paragraph text */
      }
      pre, code {
        background-color: #f0f0f0; /* Lighter background for code blocks */
        border: 1px solid #e0e0e0; /* Subtle border for code blocks */
        border-radius: 4px; /* Slightly more rounded corners */
        padding: 0.5em 0.7em; /* Adjusted padding */
        font-family: 'Courier New', monospace; /* Standard monospace font */
        font-size: 9pt; /* Slightly smaller code font */
        white-space: pre-wrap; /* Ensure wrapping */
        word-wrap: break-word; /* Break long words */
        page-break-inside: avoid; /* Avoid page breaks inside code blocks */
      }
      blockquote {
        border-left: 4px solid #cccccc; /* Thicker border for blockquotes */
        padding-left: 15px;
        margin-left: 0;
        margin-right: 0;
        color: #555; /* Slightly darker blockquote text */
        font-style: italic;
        page-break-inside: avoid;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 1em;
        page-break-inside: avoid;
      }
      th, td {
        border: 1px solid #ccc; /* Lighter table borders */
        padding: 10px; /* Increased padding */
        text-align: left;
      }
      th {
        background-color: #e8e8e8; /* Lighter table header */
        font-weight: bold;
      }
      ul, ol {
        margin-left: 20px; /* Indent lists */
        margin-bottom: 0.8em;
      }
      li {
        margin-bottom: 0.4em;
      }
      img {
        max-width: 100%; /* Ensure images don't overflow */
        height: auto;
        display: block; /* Prevent extra space below images */
        margin-top: 0.5em;
        margin-bottom: 0.5em;
        page-break-inside: avoid;
      }
      a {
        color: #007bff; /* Standard link color */
        text-decoration: none; /* Remove underline */
      }
      a:hover {
        text-decoration: underline;
      }
    `;
    // Prepend style to ensure it applies
    tempDiv.prepend(styleElement);

    // Append to body to compute styles correctly for PDF generation
    document.body.append(tempDiv);

    // Create a new PDF document (A4 size, mm units)
    const pdf = new jsPDF({
      format: 'a4', 
      orientation: 'p',
      // portrait
unit: 'mm',
    });

    // Set document properties
    pdf.setProperties({
      creator: 'LobeChat',
      subject: 'Markdown Document',
      title,
    });

    // Add the styled HTML content to the PDF
    await pdf.html(tempDiv, {
      
// Virtual window width for HTML rendering (adjust as needed)
autoPaging: 'text', 
      


// Corresponds to Top, Right, Bottom, Left margins
html2canvas: {
        scale: 0.26, // Adjust scale for quality vs size balance (lower = smaller file, lower quality)
        useCORS: true, // Enable CORS for external images if any
      }, 
      



// Enable auto paging
margin: [15, 15, 15, 15], 
      



// Top margin (mm)
width: 180, 
      



// Content width (A4 width 210mm - 2*15mm margin)
windowWidth: 800, 
      




x: 15, 
      

// Left margin (mm)
y: 15,
    });

    // Remove the temporary div from the body
    tempDiv.remove();

    // Return the PDF as a blob
    return pdf.output('blob');
  } catch (error) {
    console.error('Error converting Markdown to PDF:', error);
    throw error;
  }
};
