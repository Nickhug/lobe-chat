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
  const [isFetching, setIsFetching] = useState<boolean>(false); // Add loading state for fetch

  useEffect(() => {
    // Check if content is a valid data URL
    if (!content || !content.startsWith('data:application/pdf;base64,')) {
      message.error(t('artifacts.pdf.invalidFormat', 'Invalid PDF data format'));
      setBlobUrl(null);
      return;
    }

    let currentBlobUrl: string | null = null;
    const fetchBlob = async () => {
      setIsFetching(true); // Start loading
      setBlobUrl(null); // Clear previous blob url
      try {
        const response = await fetch(content);
        if (!response.ok) {
          throw new Error(`Failed to fetch data URL: ${response.statusText}`);
        }
        const blob = await response.blob();
        currentBlobUrl = URL.createObjectURL(blob);
        setBlobUrl(currentBlobUrl);
      } catch (error) {
        console.error('Error creating PDF blob URL via fetch:', error);
        message.error(t('artifacts.pdf.renderError', 'Error rendering PDF preview'));
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
          // Display error or placeholder if blobUrl is null and not fetching
          <div>{t('artifacts.pdf.loadFail', 'Failed to load PDF preview.')}</div>
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
