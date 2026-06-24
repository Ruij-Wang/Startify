# Startify Backend

这是 Startify 的本地后端原型，基于 FastAPI 和 SQLite，负责任务、会话和推荐数据的读写，同时为前端提供统一的 API。

## 提供的能力

- 任务管理：创建、查询、更新、归档。
- 会话记录：开始任务、结束任务、记录耗时和状态。
- 推荐接口：按当前状态返回更容易开始的任务集合。
- 健康检查：报告数据库是否可用，以及当前运行模式。
- AI 拆解占位接口：为前端保留任务拆解能力的接入口。

## 运行

在当前目录执行：

```powershell
pip install -r requirements.txt
uvicorn app.main:app --reload
```

启动后可访问：

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/api/health`

## 数据库行为

- 默认使用 `backend/data/startify.db`。
- 如果文件型 SQLite 初始化失败，会自动回退到内存数据库模式。
- `GET /api/health` 返回中的 `databaseMode` 可用于判断当前实际运行模式。

## 测试

```powershell
python -m unittest
```

测试覆盖健康检查、种子任务、任务 CRUD，以及会话完成后的任务计数更新。
