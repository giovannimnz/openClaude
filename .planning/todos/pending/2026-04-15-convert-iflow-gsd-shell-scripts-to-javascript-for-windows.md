---
created: 2026-04-15T05:34:26.542Z
title: Convert iFlow GSD shell scripts to JavaScript for Windows
area: tooling
files:
  - scripts/gsd/gsd-sync-clis.sh
  - scripts/gsd/gsd-auto-setup.sh
---

## Problem

The GSD setup scripts (gsd-sync-clis.sh, gsd-auto-setup.sh) are shell scripts that don't work on Windows environment. User needs to execute these scripts to install the iFlow get-shit-done adapter, but the current implementation is not compatible with Windows PowerShell/Command Prompt.

The scripts require:
- bash-specific features (set -euo pipefail, [[ ]], etc.)
- Unix-specific commands (readlink, ln -s, chmod, etc.)
- Unix file paths and permissions

## Solution

Create JavaScript/Node.js versions of these scripts that can be executed on Windows:

1. **gsd-sync-clis.js**: 
   - Replace bash logic with Node.js fs and child_process modules
   - Handle Windows file paths and directory creation
   - Maintain lock mechanism using filesystem
   - Execute npx commands and bridge generation

2. **gsd-auto-setup.js**:
   - Replace symlink creation with appropriate Windows alternatives (junctions, copies, or PATH modifications)
   - Handle git hook installation for Windows
   - Maintain command linking functionality for Windows executables
   - Preserve all original functionality while being Windows-compatible

The scripts should:
- Use Node.js standard library modules (fs, path, child_process, etc.)
- Handle both Windows and Unix paths when possible for portability
- Provide the same CLI arguments and flags
- Output similar progress messages
- Handle errors gracefully with clear error messages