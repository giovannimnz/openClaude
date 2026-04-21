/**
 * Command: claude auth login [google-gemini-cli]
 * Integration with openclaude's command system
 */

import type { Command } from '../../commands.js'

export default () =>
  ({
    type: 'local-jsx',
    name: 'auth-gemini',
    description: 'Manage Google Gemini CLI OAuth credentials',
    isEnabled: () => true,
    load: () => import('./auth-gemini.js'),
  }) satisfies Command
