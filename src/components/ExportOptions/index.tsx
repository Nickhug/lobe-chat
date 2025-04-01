import { Icon } from '@lobehub/ui';
import { Button, Dropdown, MenuProps, message } from 'antd';
import { DownloadIcon, FileIcon, FileTextIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { advancedMarkdownToPdf } from '@/utils/client/advancedMarkdownToPdf';
import { exportFile } from '@/utils/client/exportFile';

interface ExportOptionsProps {
  content: string;
  title?: string;
  type?: 'markdown' | 'text';
}

const ExportOptions = memo<ExportOptionsProps>(({ content, title = 'document', type = 'text' }) => {
  const { t } = useTranslation('portal');

  const handleExportMarkdown = () => {
    exportFile(content, `${title}.md`);
  };

  const handleExportText = () => {
    exportFile(content, `${title}.txt`);
  };

  const handleExportPDF = async () => {
    const key = 'exporting-pdf';
    message.loading({
      content: t('artifacts.export.exporting', 'Exporting PDF...'),
      duration: 0,
      key,
    });
    try {
      const pdfBlob = await advancedMarkdownToPdf(content, title);
      const url = URL.createObjectURL(pdfBlob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.pdf`;
      a.style.display = 'none';
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      message.success({
        content: t('artifacts.export.exportSuccess', 'Exported PDF successfully'),
        key,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      message.error({ content: t('artifacts.pdf.exportError', 'Error exporting to PDF'), key });
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      icon: <Icon icon={FileTextIcon} />,
      key: 'markdown',
      label: t('artifacts.export.markdown', 'Download as Markdown'),
      onClick: handleExportMarkdown,
    },
    {
      icon: <Icon icon={FileTextIcon} />,
      key: 'text',
      label: t('artifacts.export.text', 'Download as Text'),
      onClick: handleExportText,
    },
    {
      icon: <Icon icon={FileIcon} />,
      key: 'pdf',
      label: t('artifacts.export.pdf', 'Download as PDF'),
      onClick: handleExportPDF,
    },
  ];

  const filteredItems =
    type === 'text' ? menuItems.filter((item) => item && item.key !== 'markdown') : menuItems;

  return (
    <Dropdown menu={{ items: filteredItems }}>
      <Button icon={<Icon icon={DownloadIcon} />}>
        {t('artifacts.export.download', 'Download')}
      </Button>
    </Dropdown>
  );
});

export default ExportOptions;
