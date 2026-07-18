# Startify Backend

Startify 的本地后端，基于 FastAPI + SQLite，负责任务、会话、推荐和智能拆解，并直接提供前端入口。

## 运行

```powershell
pip install -r requirements.txt
uvicorn app.main:app --reload
```

启动后访问：

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/api/health`

## 配置 DeepSeek API

后端通过 DeepSeek 的 OpenAI-compatible Chat Completions API 调用 `deepseek-v4-flash`。本地运行时设置：

```powershell
$env:STARTIFY_LLM_API_KEY="你的 DeepSeek API Key"
$env:STARTIFY_LLM_BASE_URL="https://api.deepseek.com"
$env:STARTIFY_LLM_MODEL="deepseek-v4-flash"
$env:STARTIFY_LLM_TIMEOUT_SECONDS="30"
```

当前代码已经把 Base URL 和模型设为上述默认值，因此实际必填项只有 `STARTIFY_LLM_API_KEY`。任务拆解采用非思考模式和 JSON 输出，优先保证响应速度与结构稳定性。

配置完整时，`POST /api/ai/breakdown` 调用真实模型并返回 `source=api:<model>`。没有配置时返回透明标注的 `source=mock` 规则结果，便于本地联调。

真实 API Key 只能保存在本机或部署平台环境变量中，不要写入 `.env.example`、源码或 Git 历史。旧模型名 `deepseek-chat` 将于 2026-07-24 停用，本项目直接使用 `deepseek-v4-flash`。

## 数据库行为

- 默认使用 `backend/data/startify.db`。
- 文件型 SQLite 初始化失败时回退到内存数据库。
- `GET /api/health` 通过 `databaseMode` 报告数据库模式，通过 `aiMode` 报告 `api` 或 `mock`。

## 测试

```powershell
python -m unittest -v
```

测试覆盖健康检查、种子任务、任务 CRUD、推荐、会话计数、mock 拆解和模型供应商返回解析。
