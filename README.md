# SEO妙笔 浏览器扩展

## 项目介绍

SEO妙笔 是一个强大的浏览器扩展，旨在帮助内容创作者和SEO专业人士优化他们的内容。通过集成AI技术和搜索引擎数据，它可以自动分析关键词并生成高质量的SEO优化文章。

## 主要功能

- **关键词分析**：分析目标关键词并提供相关高质量关键词建议
- **SEO文章生成**：基于关键词和搜索结果自动生成优化的文章内容
- **多语言支持**：支持多种语言的内容生成
- **自定义文章长度**：根据需求调整生成文章的长度
- **一键复制**：轻松复制生成的关键词分析和文章内容

## 技术栈

- 纯JavaScript实现的Chrome扩展
- 使用Bootstrap进行UI设计
- 集成多种API服务：
  - AI内容生成（支持多种AI服务）
  - 关键词数据获取（支持SEMrush、SerpAPI等）
  - Google搜索结果分析

## 安装与使用

### 安装

1. 下载项目代码
2. 在Chrome浏览器中打开扩展管理页面 (`chrome://extensions/`)
3. 开启开发者模式
4. 点击"加载已解压的扩展程序"并选择项目文件夹

### 配置

1. 安装后，扩展会自动打开设置页面
2. 配置必要的API密钥：
   - AI服务API密钥
   - 搜索服务API密钥（SEMrush或SerpAPI）
   - Google API密钥和CSE ID

### 使用

1. 点击浏览器工具栏中的扩展图标打开侧边栏
2. 输入目标关键词、选择语言和国家/地区
3. 设置所需文章长度
4. 点击"开始分析"按钮
5. 查看生成的关键词分析和文章内容
6. 使用复制按钮将内容复制到剪贴板

## 隐私说明

本扩展需要访问以下API服务：
- AI服务（如DeepSeek等）
- 关键词数据服务（如SEMrush、SerpAPI）
- Google自定义搜索

所有API密钥均存储在本地，不会上传到任何服务器。

## 许可证

MIT