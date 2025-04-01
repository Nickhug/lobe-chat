import { jsPDF } from 'jspdf';

import { parseMarkdown } from '@/utils/parseMarkdown';

export const markdownToPdf = async (
  markdownContent: string,
  title: string = 'document.pdf',
): Promise<Blob> => {
  try {
    // Parse markdown to HTML
    const htmlContent = await parseMarkdown(markdownContent);

    // Create a new PDF document
    const pdf = new jsPDF();

    // Set document properties
    pdf.setProperties({
      creator: 'LobeChat',
      title,
    });

    // Create a container for HTML content to control width
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.width = '650px'; // Set a width similar to windowWidth for better rendering
    container.style.padding = '15px'; // Add padding similar to x, y margins
    document.body.append(container); // Temporarily add to body to compute styles

    // Add the HTML content to the PDF
    // Use await with pdf.html to ensure rendering completes
    await pdf.html(container, {
      // Width of the virtual window used for rendering HTML
autoPaging: 'text',
      
width: 170,
      
// Target width in PDF units (mm)
windowWidth: 650, 
      

x: 15, 
      
y: 15, // Enable auto paging based on text content
    });

    container.remove(); // Clean up the temporary container

    // Return the PDF as a blob
    return pdf.output('blob');
  } catch (error) {
    console.error('Error converting Markdown to PDF:', error);
    throw error;
  }
};
