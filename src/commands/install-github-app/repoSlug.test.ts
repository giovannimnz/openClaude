import assert from 'node:assert/strict'
import test from 'node:test'

import { extractGitHubRepoSlug } from './repoSlug.ts'

test('keeps owner/repo input as-is', () => {
  assert.equal(extractGitHubRepoSlug('giovannimnz/openClaude'), 'giovannimnz/openClaude')
})

test('extracts slug from https GitHub URLs', () => {
  assert.equal(
    extractGitHubRepoSlug('https://github.com/giovannimnz/openClaude'),
    'giovannimnz/openClaude',
  )
  assert.equal(
    extractGitHubRepoSlug('https://www.github.com/giovannimnz/openClaude.git'),
    'giovannimnz/openClaude',
  )
})

test('extracts slug from ssh GitHub URLs', () => {
  assert.equal(
    extractGitHubRepoSlug('git@github.com:giovannimnz/openClaude.git'),
    'giovannimnz/openClaude',
  )
  assert.equal(
    extractGitHubRepoSlug('ssh://git@github.com/giovannimnz/openClaude'),
    'giovannimnz/openClaude',
  )
})

test('rejects malformed or non-GitHub URLs', () => {
  assert.equal(extractGitHubRepoSlug('https://gitlab.com/giovannimnz/openClaude'), null)
  assert.equal(extractGitHubRepoSlug('https://github.com/giovannimnz'), null)
  assert.equal(extractGitHubRepoSlug('not actually github.com/giovannimnz/openClaude'), null)
  assert.equal(
    extractGitHubRepoSlug('https://evil.example/?next=github.com/giovannimnz/openClaude'),
    null,
  )
  assert.equal(
    extractGitHubRepoSlug('https://github.com.evil.example/giovannimnz/openClaude'),
    null,
  )
  assert.equal(
    extractGitHubRepoSlug('https://example.com/github.com/giovannimnz/openClaude'),
    null,
  )
})
