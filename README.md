# Startify

Startify 是一个本地优先的任务启动助手原型。它不做完整的项目管理，而是围绕“现在怎么开始”这个问题设计流程：根据当前状态推荐任务、把大任务缩成第一步、开启一个很短的倒计时会话，并记录简单的完成轨迹。

## 项目定位

- 前端：原生 HTML / CSS / JavaScript。
- 后端：FastAPI + SQLite。
- 运行模式：优先连接本地 API；如果后端不可用，前端会自动回退到浏览器本地存储模式。
- 使用场景：学习、工作或生活任务的低门槛启动，而不是复杂协作。

## 当前能力

- 根据用户当前状态推荐更容易启动的任务。
- 提供“播放器式”当前任务视图和短时倒计时。
- 支持任务创建、收藏、归档、会话记录和基础统计。
- 前端可在纯静态模式下独立运行。
- 后端可持久化任务、会话和推荐逻辑，并在首次启动时写入种子任务。
- 预留 `AI breakdown` 接口，用于把模糊的大任务拆成可开始的第一步。

## 目录结构

- `index.html`：应用入口页。
- `frontend/`：前端脚本和样式。
- `backend/app/`：FastAPI 应用、数据模型、路由和服务。
- `backend/tests/`：接口测试。
- `PLAN.md`：历史计划记录。
- `STATUS.md`：阶段进度记录。

## 运行方式

### 只跑前端

直接打开 `index.html`，或用任意静态文件服务器提供当前目录。当前端无法连接 API 时，会自动切到浏览器本地存储模式。

### 跑完整前后端

1. 进入 `backend/` 目录。
2. 安装依赖：`pip install -r requirements.txt`
3. 启动服务：`uvicorn app.main:app --reload`
4. 打开 `http://127.0.0.1:8000/`
5. API 文档地址：`http://127.0.0.1:8000/docs`

## 测试

在 `backend/` 目录执行：

```powershell
python -m unittest
```

当前测试覆盖：

- 健康检查与种子任务初始化
- 任务创建、更新、归档
- 会话完成后对任务计数的回写

## API 概览

- `GET /api/health`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/{task_id}`
- `DELETE /api/tasks/{task_id}`
- `GET /api/sessions`
- `POST /api/sessions`
- `PATCH /api/sessions/{session_id}/finish`
- `GET /api/recommendations`
- `POST /api/ai/breakdown`

## 当前限制

- `AI breakdown` 仍是原型接口，尚未接入真实模型能力。
- 数据模型按单用户、本地运行设计，没有权限和协作层。
- 前端虽然支持无后端运行，但本地模式与后端模式的数据不会自动同步。

## 仓库整理说明

以下内容已从版本管理中排除：

- SQLite 数据文件
- 测试临时数据库
- 运行日志与截图
- `tmp/` 调试产物
- Python 缓存目录
