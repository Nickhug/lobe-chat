import { DEFAULT_AGENT_META, DEFAULT_INBOX_AVATAR } from '@/const/meta';
import { DEFAULT_AGENT_CONFIG } from '@/const/settings';
import { LobeAgentSession, LobeSessionType } from '@/types/session';
import { merge } from '@/utils/merge';
import fs from 'node:fs';
import path from 'node:path';

export const INBOX_SESSION_ID = 'inbox';

export const WELCOME_GUIDE_CHAT_ID = 'welcome';

// Load the system role from file
let PROPERT_SYSTEM_ROLE = '';
try {
  // Use path relative to the project root
  const systemRolePath = path.join(process.cwd(), 'system_role.txt');
  if (fs.existsSync(systemRolePath)) {
    PROPERT_SYSTEM_ROLE = fs.readFileSync(systemRolePath, 'utf-8');
  } else {
    console.warn('system_role.txt not found, using empty system role');
  }
} catch (error) {
  console.error('Error loading system role from file:', error);
}

export const DEFAULT_AGENT_LOBE_SESSION: LobeAgentSession = {
  config: DEFAULT_AGENT_CONFIG,
  createdAt: new Date(),
  id: '',
  meta: DEFAULT_AGENT_META,
  model: DEFAULT_AGENT_CONFIG.model,
  type: LobeSessionType.Agent,
  updatedAt: new Date(),
};

export const DEFAULT_INBOX_SESSION: LobeAgentSession = merge(DEFAULT_AGENT_LOBE_SESSION, {
  id: 'inbox',
  meta: {
    avatar: DEFAULT_INBOX_AVATAR,
  },
  config: {
    systemRole: PROPERT_SYSTEM_ROLE,
  },
});
