# Startify 项目计划

## 1. 项目目标

把当前的 `Startify` 早期 demo 整理成一个可继续扩展的产品原型。当前阶段以“先让用户快速开始一个小任务”为核心，不追求完整任务管理平台。

这次对话的主线已经切到后端。前端结构和视觉方向继续沿用原计划，当前开发重点改为把后端接口先搭起来，给后续联调留出稳定基础。

## 2. 已确定的产品和技术决策

- 产品形态仍然是单用户、本地运行的原型。
- 前端保留四个核心页面：播放器、启动、清单、添加。
- 后端技术栈使用 `FastAPI + SQLite`。
- 推荐逻辑先写成本地规则，不接真实模型。
- `AI Breakdown` 先保留接口位，返回 mock 结果。
- 任务删除先采用归档，不直接物理删除。

## 3. 当前后端范围

本轮后端范围控制在最小闭环，目的是先把数据模型和接口跑通：

- 建立 `backend/` 工程目录
- 建立任务模型 `tasks`
- 建立会话模型 `sessions`
- 建立推荐接口 `recommendations`
- 建立 `AI Breakdown` mock 接口
- 建立基础测试
- 建立运行说明文档

## 4. 当前已完成的后端计划

- 已完成 `FastAPI` 应用骨架
- 已完成 `SQLite` 数据模型定义
- 已完成默认种子任务写入
- 已完成任务接口：
  - `GET /api/tasks`
  - `POST /api/tasks`
  - `GET /api/tasks/{task_id}`
  - `PATCH /api/tasks/{task_id}`
  - `DELETE /api/tasks/{task_id}`
- 已完成会话接口：
  - `GET /api/sessions`
  - `POST /api/sessions`
  - `GET /api/sessions/{session_id}`
  - `PATCH /api/sessions/{session_id}/finish`
- 已完成推荐接口：
  - `GET /api/recommendations`
- 已完成 AI 预留接口：
  - `POST /api/ai/breakdown`
- 已完成健康检查：
  - `GET /api/health`
- 已完成三条基础接口测试，并已通过

## 5. 当前后端数据结构

### 任务 Task

当前任务模型包含这些字段：

- `id`
- `title`
- `category`
- `durationMin`
- `energyLevel`
- `favorite`
- `source`
- `tags`
- `recommendedFor`
- `playCount`
- `completedCount`
- `createdAt`
- `updatedAt`

### 会话 Session

当前会话模型包含这些字段：

- `id`
- `taskId`
- `triggerState`
- `status`
- `elapsedSec`
- `note`
- `startedAt`
- `endedAt`

## 6. 当前阻塞点

当前代码在本环境下能正常启动，但默认文件版 SQLite 无法直接写入，会自动回退到内存版 SQLite。也就是说：

- 接口可用
- 文档页可用
- 联调可做
- 进程重启后数据不会保留

这个问题已经被代码显式处理，并通过 `/api/health` 的 `databaseMode` 暴露出来。

## 7. 下一阶段计划

下一阶段建议按这个顺序推进：

1. 前端开始接后端接口，替换本地假数据。
2. 解决文件版 SQLite 持久化问题，确认最终数据库落点和写入策略。
3. 给推荐逻辑补充更明确的排序规则和筛选条件。
4. 增加任务分类、收藏、最近会话等前端真正会用到的查询接口。
5. 如果后续需要真实 AI，再把 `ai/breakdown` 从 mock 换成真实 adapter。

## 8. 当前判断

当前项目已经不适合继续停留在“单个 `index.html` demo”阶段。后端骨架现在已经有了，后续工作最重要的是把前后端接口边界固定下来，再处理持久化和联调细节。
