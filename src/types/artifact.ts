export interface PortalArtifact {
  children?: string;
  id: string;
  identifier?: string;
  language?: string;
  title?: string;
  type?: string;
}

export enum ArtifactType {
  Code = 'application/lobe.artifacts.code',
  Default = 'html',
  Image = 'image/png',
  PDF = 'application/pdf',
  Python = 'python',
  React = 'application/lobe.artifacts.react',
  Text = 'text/plain',
}
