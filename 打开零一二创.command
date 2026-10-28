#!/bin/zsh
cd "${0:A:h}" || exit 1
if ! command -v node >/dev/null 2>&1; then
  print '请先安装 Node.js 22.12 或更新版本，再打开此文件。'
  read '?按回车关闭。'
  exit 1
fi
node scripts/preview_rixin.mjs --open
