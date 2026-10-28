# 零一·棱光序章 · 工程与集成说明

项目用途、开场截图和社员使用入口见 [README.md](README.md)。本项目由零一 AI 日新社专为社员定制，维护三角几何版 DSH 开场。

## 离线预览

Node.js 22.12+，无需安装依赖：

```sh
npm start
# 同一入口，也可直接执行
node scripts/preview_rixin.mjs --open
```

默认端口 4186，默认深色。端口占用时只复用本仓库的预览，不停止其他服务。可用 `--port 4187` 临时选择另一端口。预览 API 始终返回不可用，不模拟连接、身份、Skills、插件数量或聊天回复。

源码中的 `/workbench/` 可展示已构建的 Web 工作台；真实交互需要 Rust 后端。社员使用包只包含开场，不附带工作台构建。

## 桌面接入与打包

桌面插件元数据位于 `integrations/desktop-startup/`，桥接、状态和覆盖层复用仓库内部的 `integrations/native-startup/`。安装器将它们合成 `dsh-rixin-startup` 包，无需 Rust。

```sh
# 仅打包，不安装、不修改本机 DSH 配置
python3 scripts/install_desktop_startup.py --pack-only

# 安装到已初始化且已退出的 macOS DSH Desktop
python3 scripts/install_desktop_startup.py

# 桌面 CLI 不在默认位置时指定路径
python3 scripts/install_desktop_startup.py --cli /absolute/path/to/dsh
```

安装器默认寻找 `/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh`，读取 `DSH_HOME` 或 `~/.dsh`，备份桌面 profile 后调用官方插件管理命令，再启用 `startup-animation/settings.json` 中的开场设置。配置备份位于 `startup-animation/backups/`。

卸载时在桌面版「插件」面板移除 `dsh-rixin-startup`，然后完全退出并重开。也可用相同桌面 CLI 执行：

```sh
dsh plugin --profile desktop remove dsh-rixin-startup
```

## 运行机制

1. **插件加载**：DSH 的桌面 profile 通过 `dsh.bundle.patch` 加载插件，使用 `webserver/index-inject` 注入覆盖层，不修改应用的 app.asar。
2. **桌面桥接**：`dsh-app://app` 通过应用自身的协议处理器连接本机 Host。插件校验官方认证 Cookie、本机来源和写操作随机令牌。
3. **动态绘制**：Canvas 2D 与 `requestAnimationFrame` 驱动三角拼装、扫描和揭幕；品牌层只适配黑白配色、社团 Logo、文案和细刻线，不另写阶段时间线。
4. **真实状态**：能力读取使用默认 Agent 预设的真实作用域，调用 `skills.snapshot()`、`loader.entries()` 和 `compositionInventory()`，不发送模型任务。
5. **返回与恢复**：跨 iframe 消息校验来源窗口、精确 origin 与随机 channel。覆盖层每个 Host 进程、每个标签页只播放一次；独立返回按钮与资源超时释放机制避免界面被持续遮挡。
6. **音效与性能**：Web Audio 在本机合成机械音效，旁白播放时降低机械声；暂停、跳过、静音和卸载会停止音源。能力清单按数据批次更新，保留已有行和滚动位置。

动效与时间线的维护约定见 [DESIGN.md](docs/rixin/DESIGN.md)。原始 Logo 位于 `docs/assets/rixin-logo.jpg`，Web 工作台副本位于 `web/public/rixin-logo.jpg`。

## 开发检查

```sh
# 开场、控制器、生命周期与插件桥接
npm test

# 隔离的安装器检查，不改动真实 DSH 配置
TMPDIR=/private/tmp python3 scripts/test_install_dsh.py

# Web 工作台
npm ci --prefix web
npm --prefix web test
npm --prefix web run build

# 生成社员使用包、桌面插件包与 SHA-256 校验文件
python3 scripts/package_rixin_release.py
```

发布前检查覆盖离线开场、真实清单协议、桌面认证桥接、键盘交互、超时释放和前端构建。桌面接入已有 macOS DSH Desktop 0.2.1-rc.3 的实机验证记录；当前发布检查不安装或重启社员本机的 DSH。

本机尚未提供 Rust / Cargo，Rust 后端、TUI 和 Windows 原生二进制没有在本次发布中编译或运行。相关开发命令保留在 [上游文档归档](README-UPSTREAM.md)。
