<div align="center">
  <img src=".github/logo.gif" alt="MioChat Plugins" >
  
[![Backend](https://img.shields.io/badge/MioChat_Backend-2C2D2E?logo=github)](https://github.com/Pretend-to/mio-chat-backend)
[![Frontend](https://img.shields.io/badge/MioChat_Frontend-2C2D2E?logo=github)](https://github.com/Pretend-to/mio-chat-frontend)

**扩展 MioChat 的无限可能**  
精选插件库 | 即装即用 | 开发者友好

</div>

---

## 🛠️ 快速安装指南

### 轻量级 JS 插件
```bash
# 1. 进入插件目录
cd ./plugins/custom

# 2. 下载插件（示例：draw插件）
wget https://raw.githubusercontent.com/awesome-miochat-plugins/custom/main/draw.js

# 3. 刷新浏览器即可生效 🎉
```

### 项目级插件
```bash
# 克隆并初始化插件（示例：prodia插件）
git clone https://github.com/Pretend-to/prodia-plugin.git ./plugins/prodia-plugin
cd ./plugins/prodia-plugin && pnpm install

# 重启 MioChat 服务
pnpm run restart
```

---

## 🔌 精选插件库

### 核心扩展组件

| 插件名称 | 功能描述 | 开发者 | 项目地址 |
|---|---|---|---|
| **MCP-Plugin** | MCP 接口集成 | 官方 | [内置插件](https://github.com/Pretend-to/mio-chat-backend) |
| **Web-Plugin** | 网页搜索，网页解析，发送请求等网络相关功能 | 官方 | [内置插件](https://github.com/Pretend-to/mio-chat-backend) |
| **Prodia-Plugin** | AI 图像/视频生成接口集成 | 官方 | [GitHub](https://github.com/Pretend-to/prodia-plugin) |

### 即用型工具

| 插件名称 | 功能亮点 | 开发者 | 项目地址 |
|---|---|---|---|
| **Draw** | 集成 Stable Diffusion 与 土块 绘图 | 官方 | [GitHub](https://github.com/Pretend-to/awesome-miochat-plugins) |
| **Notebook** | 生成可下载的 Jupyter Notebook | 官方 | [GitHub](https://github.com/Pretend-to/awesome-miochat-plugins) |
| **FileParser** | 支持多格式文件智能解析 | 官方 | [GitHub](https://github.com/Pretend-to/awesome-miochat-plugins) |

---

## 👩💻 开发者专区

### 提交你的创意
1. **Fork 本仓库**
2. 将插件添加到对应目录：
   - JS 插件 → `/custom` → 更新插件目录表
   - 项目插件 → 在表格中追加项目信息
3. 发起 Pull Request

### 开发规范
- 保持 JS 插件单文件结构（≤500 行）
- 项目插件需包含完整文档
- 通过文档 [MioChat 开发指南](https://api.miochat.com/docs) 开发

---

## 📜 协议说明
本项目采用 [MIT License](LICENSE)，欢迎在遵守协议的前提下自由使用和二次开发。

<div align="center" style="margin-top: 40px;">
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen" alt="欢迎贡献">
  <img src="https://img.shields.io/github/last-commit/Pretend-to/awesome-miochat-plugins" alt="最后更新">
</div>
