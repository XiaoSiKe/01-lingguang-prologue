# 零一·棱光序章 · DSH 桌面开场

本插件是零一 AI 日新社专为社员制作的 DSH 开场动效，将三角几何与银灰社团徽记接入现有 DeepSeek Harness Desktop。
使用桌面版自带的插件管理和 `webserver/index-inject` 接口，不修改应用的 app.asar。

安装后完全退出 DSH（macOS：Command+Q），再点击原来的 DeepSeek Harness 图标。
开场完成或按 Esc 后回到原来的聊天界面。仅关窗口、再切回仍运行的进程不会重新开场。

- 启动后自动播放前序；Enter / Space 确认身份和能力结果，C 播放设置，M 静音，Esc 返回 DSH。
- 身份与真实能力清单通过桌面应用自己的已认证 Host 连接读取。
- 动画中的身份卡是开场资料，不替代 DSH 官方账号登录。
- 刷新不会在同一 Host 进程、同一标签页里重复盖住界面；完整重启后自动再次播放。
- 父界面的「返回 Harness」可独立退出，动画资源失败时会自动释放界面。
- 模型凭据、会话、工作区仍由原 DSH 管理。
- 本地合成马达、气阀、继电器与金属锁扣音效，旁白播放时自动降低机械声；M 一并静音。
- 能力清单按数据批次更新，保留已有行与滚动位置，避免逐条重建造成卡顿。

安装：在源码目录运行 `python3 scripts/install_desktop_startup.py`。
卸载：使用桌面版「插件」面板移除 `dsh-rixin-startup`，然后完全退出并重开。
也可运行桌面版自带 CLI：`dsh plugin --profile desktop remove dsh-rixin-startup`。

配置保存到 `~/.dsh/startup-animation/settings.json`；安装前的 profile 配置备份到
`~/.dsh/startup-animation/backups/`。本插件不安装 Rust 或另一套 DSH。
