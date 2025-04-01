import { Icon } from '@lobehub/ui';
import { Button, message } from 'antd';
import { Download as DownloadIcon } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { downloadFile } from '@/utils/client/downloadFile';

interface PDFRendererProps {
  content: string; // Base64 encoded PDF data url
  title?: string;
}

const PDFRenderer = memo<PDFRendererProps>(({ content, title = 'document.pdf' }) => {
  const { t } = useTranslation('portal');
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null); // State for specific error message
  const [isFetching, setIsFetching] = useState<boolean>(false); // Add loading state for fetch

  useEffect(() => {
    // Reset states on content change
    setBlobUrl(null);
    setFetchError(null);
    setIsFetching(true);

    // Check if content is a valid data URL
    if (!content || !content.startsWith('data:application/pdf;base64,')) {
      const errorMsg = t('artifacts.pdf.invalidFormat', 'Invalid PDF data format');
      console.error('PDF Render Error:', errorMsg, {
        contentStart: content.slice(0, 100) + '...',
      });
      message.error(errorMsg);
      setFetchError(errorMsg);
      setIsFetching(false);
      return;
    }

    let currentBlobUrl: string | null = null;
    const fetchBlob = async () => {
      try {
        const response = await fetch(content);
        if (!response.ok) {
          throw new Error(`Fetch failed with status: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();

        // Verify the blob type
        if (blob.type !== 'application/pdf') {
          throw new Error(`Expected PDF blob, but received type: ${blob.type}`);
        }

        currentBlobUrl = URL.createObjectURL(blob);
        setBlobUrl(currentBlobUrl);
        setFetchError(null); // Clear error on success
      } catch (error: any) {
        // Catch specific error
        const errorMsg = t('artifacts.pdf.renderError', 'Error rendering PDF preview');
        console.error('Error creating PDF blob URL via fetch:', error); // Log the actual error object
        message.error(errorMsg);
        setFetchError(errorMsg + (error.message ? `: ${error.message}` : '')); // Set specific error message
        setBlobUrl(null);
      } finally {
        setIsFetching(false); // Stop loading
      }
    };

    fetchBlob();

    // Cleanup function
    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [content, t]);

  const handleDownload = async () => {
    try {
      setLoading(true);
      await downloadFile(content, title);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      message.error(t('artifacts.pdf.downloadError', 'Error downloading PDF'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flexbox gap={16} style={{ flexDirection: 'column', height: '100%' }} width={'100%'}>
      <Flexbox flex={1} style={{ height: '0', overflow: 'hidden' }}>
        {isFetching ? (
          <div>{t('artifacts.pdf.loadingPreview', 'Loading PDF preview...')}</div>
        ) : blobUrl ? (
          <iframe
            ref={iframeRef}
            src={blobUrl}
            style={{ border: 'none', height: '100%', width: '100%' }}
            title="PDF Preview"
          />
        ) : (
          // Display specific error message if available, otherwise generic failure
          <div>{fetchError || t('artifacts.pdf.loadFail', 'Failed to load PDF preview.')}</div>
        )}
      </Flexbox>
      <Flexbox align={'center'} padding={8}>
        <Button icon={<Icon icon={DownloadIcon} />} loading={loading} onClick={handleDownload}>
          {t('artifacts.pdf.download', 'Download PDF')}
        </Button>
      </Flexbox>
    </Flexbox>
  );
});

export default PDFRenderer;
