import { Icon } from '@lobehub/ui';
import { Button } from 'antd';
import { Download as DownloadIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Center, Flexbox } from 'react-layout-kit';

import { downloadFile } from '@/utils/client/downloadFile';

// Assuming downloadFile utility exists

interface ImageRendererProps {
  content: string; // Base64 encoded image data url
  title?: string;
}

const ImageRenderer = memo<ImageRendererProps>(({ content, title = 'image.png' }) => {
  const { t } = useTranslation('portal');

  const handleDownload = () => {
    // Assuming content is a data URL (data:image/png;base64,...)
    downloadFile(content, title);
  };

  return (
    <Flexbox
      height={'100%'}
      style={{ flexDirection: 'column', gap: '16px', overflow: 'hidden', position: 'relative' }}
      width={'100%'}
    >
      <Center flex={1} style={{ overflow: 'auto', padding: '16px' }} width={'100%'}>
        <img
          alt={title}
          src={content}
          style={{
            maxHeight: '100%',
            maxWidth: '100%',
            objectFit: 'contain',
          }}
        />
      </Center>
      <Flexbox align={'center'} padding={8}>
        <Button icon={<Icon icon={DownloadIcon} />} onClick={handleDownload}>
          {t('artifacts.image.download', 'Download Image')}
        </Button>
      </Flexbox>
    </Flexbox>
  );
});

export default ImageRenderer;
