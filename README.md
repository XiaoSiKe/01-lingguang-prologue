# 零一·棱光序章

**零一 AI 日新社专为社员制作的 DSH 开场动效。**

在打开 DeepSeek Harness（DSH）、开始编程与创造之前，用一段三角几何构造、银灰社团徽记与机械音效组成的开场，迎接每一次从零到一。

> **从零到一，让技术进步成为每个人的机会！**

![零一·棱光序章开场截图：三角几何、银灰社团 Logo 与初心标语](docs/assets/lingguang-opening.png)

*截图来自实际运行的深色离线预览；离线状态不会读取社员身份或本机能力数据。*

## 给社员的使用入口

在 [Releases](https://github.com/XiaoSiKe/01-lingguang-prologue/releases/latest) 下载 `lingguang-prologue-v0.1.8.zip` 社员使用包，解压后进入目录。使用包包含开场资源、预览入口与桌面安装脚本。

### 先看开场

需要 Node.js **22.12+**，无需安装 DSH、Rust 或模型凭据。

```sh
npm start
```

浏览器打开 <http://127.0.0.1:4186/>。macOS 也可双击目录中的 `打开零一二创.command`。

点击「开启序列」或按 Enter 开始。Enter / Space 确认，C 打开设置，P 暂停，M 静音，R 重播，Esc 跳过；支持深浅色和系统的“减少动态效果”。关闭预览时在终端按 Ctrl+C。

离线预览仅展示动效，连接、身份、Skills 和插件清单会明确显示真实数据不可用。

### 接入已经安装的 DSH 桌面版

当前桌面接入验证基于 **macOS / DeepSeek Harness Desktop 0.2.1-rc.3**。需要 Python 3、Node.js **22.19+（22.x）或 24+** 及 npm。先打开 DSH 一次以初始化桌面配置，然后完全退出应用。

在解压后的使用包或源码目录运行：

```sh
python3 scripts/install_desktop_startup.py
```

脚本会打包插件、备份现有桌面 profile、安装并启用开场。完成后重新打开原来的 DSH 应用图标即可体验；开场结束或按 Esc 返回原来的聊天界面。身份卡属于开场资料，账号登录仍由 DSH 负责。

Release 中另附 `dsh-rixin-startup-0.1.8.tgz` 桌面插件包，供已有插件集成流程使用；首次接入建议使用上面的安装脚本，它会同时处理备份和开场启用设置。

卸载方式、指定桌面 CLI 路径与打包命令见 [工程与集成说明](README-RIXIN.md)。Windows / Linux 的桌面接入尚未实机验证；跨平台离线预览可直接使用 Node.js 启动。

## 这段开场有什么

- 保留上游六阶段时间线与三处确认：序章、本地连接、身份确认、能力读取、结果确认、从零到一。
- 延续 DELTA CIRCUIT 三角几何构造，融合日新社原始银灰 Logo，保留其比例和细节。
- 使用黑、白、中性灰与本地合成机械音效，支持静音、暂停、重播和减少动态效果。
- 桌面模式通过 DSH 自身的认证连接读取真实身份资料与已加载能力，不发起模型请求。
- 开场保留独立返回按钮与资源超时退出机制，结束后回到 DSH。

## 从源码运行

```sh
git clone https://github.com/XiaoSiKe/01-lingguang-prologue.git
cd 01-lingguang-prologue
npm start
```

源码中保留上游 Rust Harness 与 Web 工作台，便于追溯和开发；社员体验开场无需编译这些部分。开发和检查命令见 [README-RIXIN.md](README-RIXIN.md)，产品与视觉约定见 [PRODUCT.md](docs/rixin/PRODUCT.md) 和 [DESIGN.md](docs/rixin/DESIGN.md)。

## 来源与致谢

基于 [Ar1haraNaN7mI/deepseek-harness-rust-optimize](https://github.com/Ar1haraNaN7mI/deepseek-harness-rust-optimize) 的独立源码副本，基线提交为 `71dbb7d07d0ef20eaf708f15aca967d1b02bd8fb`。感谢上游的启动演出、控制器和集成实现。原始工程说明保存在 [上游文档归档](README-UPSTREAM.md)。

本项目由零一 AI 日新社面向社员定制，是社区开场扩展。DSH 的运行时、模型服务与账号系统由原项目提供。插件代码沿用 [MIT 许可](integrations/native-startup/LICENSE)；社团 Logo 与第三方资源保留各自权利及许可，第三方资源说明见 [资源许可目录](docs/assets/licenses/)。
