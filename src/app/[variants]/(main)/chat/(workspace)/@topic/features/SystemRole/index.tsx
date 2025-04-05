'use client';

import { memo } from 'react';

import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';

import SystemRoleContent from './SystemRoleContent';

const SystemRole = memo(() => {
  const { isAgentEditable: showSystemRole } = useServerConfigStore(featureFlagsSelectors);
  const isInbox = useSessionStore(sessionSelectors.isInboxSession);

  // Always show system role for Propert inbox, and respect server config for other chats
  return showSystemRole && <SystemRoleContent />;
});

export default SystemRole;
