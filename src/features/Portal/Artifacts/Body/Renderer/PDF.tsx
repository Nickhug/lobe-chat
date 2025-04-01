import { Icon } from '@lobehub/ui';
import { Button, message } from 'antd';
import { Download as DownloadIcon } from 'lucide-react';
import { memo, useState } from 'react';
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

  const handleDownload = async () => {
    try {
      setLoading(true);
      // Assuming content is a data URL (data:application/pdf;base64,...)
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
        <iframe
          src={content}
          style={{ border: 'none', height: '100%', width: '100%' }}
          title="PDF Preview"
        />
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
