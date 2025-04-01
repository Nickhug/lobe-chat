import { Icon } from '@lobehub/ui';
import { Button, message } from 'antd';
import { Download as DownloadIcon, ExternalLink } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Center, Flexbox } from 'react-layout-kit';

import { downloadFile } from '@/utils/client/downloadFile';

interface ImageRendererProps {
  content: string; // Can be a URL or base64 data
  title?: string;
}

const ImageRenderer = memo<ImageRendererProps>(({ content, title }) => {
  const { t } = useTranslation('portal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if content is a URL or base64 data
  const isUrl = content.startsWith('http://') || content.startsWith('https://');

  // Generate filename for download
  const filename =
    title || (isUrl ? content.split('/').pop()?.split('?')[0] || 'image' : 'image.png');

  // Handle image load error
  const handleImageError = () => {
    setError(t('artifacts.image.loadError', 'Failed to load image'));
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      await downloadFile(content, filename);
    } catch (err) {
      console.error('Error downloading image:', err);
      message.error(t('artifacts.image.downloadError', 'Error downloading image'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExternal = () => {
    window.open(content, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    setError(null); // Reset error state when content changes
  }, [content]);

  return (
    <Flexbox
      height={'100%'}
      style={{ flexDirection: 'column', gap: '16px', overflow: 'hidden', position: 'relative' }}
      width={'100%'}
    >
      <Flexbox flex={1} style={{ overflow: 'auto', padding: '16px' }} width={'100%'}>
        {error ? (
          <Center height="100%" width="100%">
            <div>{error}</div>
          </Center>
        ) : (
          <Center flex={1} width={'100%'}>
            <img
              alt={title || 'Image Artifact'}
              onError={handleImageError}
              src={content}
              style={{
                maxHeight: '100%',
                maxWidth: '100%',
                objectFit: 'contain',
              }}
            />
          </Center>
        )}
      </Flexbox>
      <Flexbox align={'center'} gap={8} justify="center" padding={8}>
        <Button icon={<Icon icon={DownloadIcon} />} loading={loading} onClick={handleDownload}>
          {t('artifacts.image.download', 'Download Image')}
        </Button>
        {isUrl && (
          <Button icon={<Icon icon={ExternalLink} />} onClick={handleOpenExternal}>
            {t('artifacts.image.openExternal', 'Open Original')}
          </Button>
        )}
      </Flexbox>
    </Flexbox>
  );
});

export default ImageRenderer;
