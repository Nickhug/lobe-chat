import type { IconType } from '@lobehub/icons';
import type { LobeChatProps } from '@lobehub/ui/brand';
import { createStyles, useTheme } from 'antd-style';
import Image, { ImageProps } from 'next/image';
import { ReactNode, forwardRef, memo } from 'react';
import { Flexbox, FlexboxProps } from 'react-layout-kit';

import { BRANDING_LOGO_URL, BRANDING_HEADER_LOGO_URL, BRANDING_LOGO_WIDTH, BRANDING_LOGO_HEIGHT, BRANDING_NAME } from '@/const/branding';

const useStyles = createStyles(({ css }) => {
  return {
    extraTitle: css`
      font-weight: 300;
      white-space: nowrap;
    `,
  };
});

const CustomTextLogo = memo<FlexboxProps & { size: number }>(({ size, style, ...rest }) => {
  return (
    <Flexbox
      height={size}
      style={{
        fontSize: size / 1.5,
        fontWeight: 'bolder',
        userSelect: 'none',
        ...style,
      }}
      {...rest}
    >
      {BRANDING_NAME}
    </Flexbox>
  );
});

const CustomImageLogo = memo<Omit<ImageProps, 'alt' | 'src'> & { size: number }>(
  ({ size, ...rest }) => {
    return (
      <div style={{ height: size, display: 'flex', alignItems: 'center' }}>
        <img
          alt={BRANDING_NAME}
          src={BRANDING_HEADER_LOGO_URL}
          style={{ 
            height: 'auto',
            maxHeight: size,
            width: 'auto',
            maxWidth: `${size * 1.5}px`,
            objectFit: 'contain'
          }}
          {...rest}
        />
      </div>
    );
  },
);

const Divider: IconType = forwardRef(({ size = '1em', style, ...rest }, ref) => (
  <svg
    fill="none"
    height={size}
    ref={ref}
    shapeRendering="geometricPrecision"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flex: 'none', lineHeight: 1, ...style }}
    viewBox="0 0 24 24"
    width={size}
    {...rest}
  >
    <path d="M16.88 3.549L7.12 20.451" />
  </svg>
));

const CustomLogo = memo<LobeChatProps>(({ extra, size = 32, className, style, type, ...rest }) => {
  const theme = useTheme();
  const { styles } = useStyles();
  let logoComponent: ReactNode;

  // Default to image logo regardless of type
  switch (type) {
    case 'text': {
      logoComponent = <CustomTextLogo size={size} style={style} {...rest} />;
      break;
    }
    case 'combine': {
      logoComponent = (
        <>
          <CustomImageLogo size={size} />
          <CustomTextLogo size={size} style={{ marginLeft: Math.round(size / 4) }} />
        </>
      );

      if (!extra)
        logoComponent = (
          <Flexbox align={'center'} flex={'none'} horizontal {...rest}>
            {logoComponent}
          </Flexbox>
        );

      break;
    }
    default: {
      // Use the image logo by default
      logoComponent = <CustomImageLogo size={size} style={style} {...rest} />;
      break;
    }
  }

  if (!extra) return logoComponent;

  const extraSize = Math.round((size / 3) * 1.9);

  return (
    <Flexbox align={'center'} className={className} flex={'none'} horizontal {...rest}>
      {logoComponent}
      <Divider size={extraSize} style={{ color: theme.colorFill }} />
      <div className={styles.extraTitle} style={{ fontSize: extraSize }}>
        {extra}
      </div>
    </Flexbox>
  );
});

export default CustomLogo;
