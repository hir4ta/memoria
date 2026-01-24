#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const packageDir = path.dirname(__dirname);
const projectRoot = process.cwd();

function showHelp() {
  console.log(`
memoria - Claude Code の長期記憶プラグイン

Usage:
  memoria --dashboard    Webダッシュボードを起動
  memoria -d             同上（短縮形）
  memoria --port <port>  ポート番号を指定（デフォルト: 3000）
  memoria --help         ヘルプを表示

Examples:
  cd /path/to/your/project
  npx @hir4ta/memoria --dashboard
  npx @hir4ta/memoria -d --port 3001
`);
}

function checkMemoriaDir() {
  const memoriaDir = path.join(projectRoot, '.memoria');
  if (!fs.existsSync(memoriaDir)) {
    console.log(`\nWARNING: .memoria ディレクトリが見つかりません: ${projectRoot}`);
    console.log('        memoriaプラグインがインストールされたClaude Codeセッションを');
    console.log('        このプロジェクトで実行すると、データが作成されます。');
  }
}

function getPort() {
  const portIndex = args.indexOf('--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    return parseInt(args[portIndex + 1], 10) || 3000;
  }
  return 3000;
}

function startDashboard() {
  checkMemoriaDir();

  const port = getPort();
  const standaloneServer = path.join(packageDir, '.next', 'standalone', 'server.js');
  const staticDir = path.join(packageDir, '.next', 'static');
  const publicDir = path.join(packageDir, 'public');

  // Check if standalone build exists
  if (!fs.existsSync(standaloneServer)) {
    console.error('ERROR: ビルド済みサーバーが見つかりません。');
    console.error('       パッケージが正しくインストールされていない可能性があります。');
    process.exit(1);
  }

  console.log(`\nmemoria dashboard`);
  console.log(`Project: ${projectRoot}`);
  console.log(`URL: http://localhost:${port}\n`);

  const child = spawn('node', [standaloneServer], {
    cwd: path.join(packageDir, '.next', 'standalone'),
    env: {
      ...process.env,
      MEMORIA_PROJECT_ROOT: projectRoot,
      PORT: port.toString(),
      HOSTNAME: 'localhost'
    },
    stdio: 'inherit'
  });

  child.on('error', (err) => {
    console.error('ERROR: ダッシュボードの起動に失敗しました:', err.message);
    process.exit(1);
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });
}

// Parse arguments
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (args.includes('--dashboard') || args.includes('-d')) {
  startDashboard();
} else {
  console.error(`ERROR: 不明なオプション: ${args.join(' ')}`);
  showHelp();
  process.exit(1);
}
