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

  useEffect(() => {
    let url: string | null = null;
    try {
      const byteCharacters = atob(content.split(',')[1]);
      const byteNumbers = Array.from({length: byteCharacters.length});
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });

      url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch (error) {
      console.error('Error creating PDF blob URL:', error);
      message.error(t('artifacts.pdf.renderError', 'Error rendering PDF preview'));
      setBlobUrl(null);
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [content]);

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
        {blobUrl ? (
          <iframe
            ref={iframeRef}
            src={blobUrl}
            style={{ border: 'none', height: '100%', width: '100%' }}
            title="PDF Preview"
          />
        ) : (
          <div>{t('artifacts.pdf.loadingPreview', 'Loading PDF preview...')}</div>
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
