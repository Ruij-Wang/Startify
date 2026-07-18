const STORAGE_KEYS = {
  apiBase: "startify-api-base",
  localState: "startify-local-state"
};

const STATE_OPTIONS = [
  {
    key: "anxious",
    label: "我很焦虑",
    hint: "先做门槛低、动作明确的事",
    desc: "先缩小动作范围，让开始这件事轻一点。"
  },
  {
    key: "blank",
    label: "脑子空白",
    hint: "先激活思路，再往下走",
    desc: "适合步骤明确、不需要太多思考准备的任务。"
  },
  {
    key: "tired",
    label: "我很累",
    hint: "先做低能量的小任务",
    desc: "短时长、低消耗优先，先把状态拉起来。"
  },
  {
    key: "ten_min",
    label: "只剩 10 分钟",
    hint: "只看超短任务",
    desc: "这时候先推进一点，比完整规划更重要。"
  }
];

const CATEGORY_LABELS = {
  all: "全部",
  study: "学习",
  work: "工作",
  life: "生活",
  health: "状态",
  general: "其他"
};

const LOCAL_TASK_TEMPLATES = [
  {
    title: "喝一口水",
    category: "health",
    durationMin: 2,
    energyLevel: 1,
    favorite: false,
    source: "local",
    tags: ["quick", "reset", "no-prep"],
    recommendedFor: ["anxious", "tired", "ten_min"]
  },
  {
    title: "打开作业文档",
    category: "study",
    durationMin: 3,
    energyLevel: 1,
    favorite: true,
    source: "local",
    tags: ["clear-step", "no-prep"],
    recommendedFor: ["anxious", "blank", "ten_min"]
  },
  {
    title: "写一句提纲",
    category: "work",
    durationMin: 5,
    energyLevel: 1,
    favorite: true,
    source: "local",
    tags: ["clear-step"],
    recommendedFor: ["blank", "anxious"]
  },
  {
    title: "整理桌面 5 分钟",
    category: "life",
    durationMin: 5,
    energyLevel: 2,
    favorite: false,
    source: "local",
    tags: ["reset", "clear-step"],
    recommendedFor: ["blank", "tired"]
  },
  {
    title: "复习一个知识点",
    category: "study",
    durationMin: 10,
    energyLevel: 2,
    favorite: false,
    source: "local",
    tags: ["focus"],
    recommendedFor: ["blank", "ten_min"]
  },
  {
    title: "站起来活动一下",
    category: "health",
    durationMin: 4,
    energyLevel: 1,
    favorite: false,
    source: "local",
    tags: ["body", "reset"],
    recommendedFor: ["tired", "anxious", "ten_min"]
  }
];

const appState = {
  apiBase: resolveApiBase(),
  dataMode: "remote",
  health: null,
  tasks: [],
  recommendations: [],
  sessions: [],
  localStore: null,
  currentScreen: "player",
  selectedState: "anxious",
  selectedTaskId: null,
  listFilter: "all",
  search: "",
  activeSessionId: null,
  timerTotalSec: 120,
  timerRemainingSec: 120,
  timerRunning: false,
  timerIntervalId: null,
  lastTickAt: null,
  createStates: ["anxious"],
  aiSuggestion: null
};

const elements = {
  healthPill: document.getElementById("health-pill"),
  apiTip: document.getElementById("api-tip"),
  todayStarted: document.getElementById("today-started"),
  todayCompleted: document.getElementById("today-completed"),
  refreshBtn: document.getElementById("refresh-app"),
  navButtons: [...document.querySelectorAll(".nav-btn")],
  screens: [...document.querySelectorAll(".screen")],
  currentTitle: document.getElementById("current-title"),
  currentCategory: document.getElementById("current-category"),
  currentSummary: document.getElementById("current-summary"),
  currentDuration: document.getElementById("current-duration"),
  currentEnergy: document.getElementById("current-energy"),
  currentState: document.getElementById("current-state"),
  prepareChip: document.getElementById("prepare-chip"),
  favoriteCurrent: document.getElementById("favorite-current"),
  timerText: document.getElementById("timer-text"),
  timerCaption: document.getElementById("timer-caption"),
  startToggle: document.getElementById("start-toggle"),
  completeTask: document.getElementById("complete-task"),
  skipTask: document.getElementById("skip-task"),
  nextTitle: document.getElementById("next-title"),
  nextSummary: document.getElementById("next-summary"),
  nextTags: document.getElementById("next-tags"),
  useNextTask: document.getElementById("use-next-task"),
  stateGrid: document.getElementById("state-grid"),
  launchStateTitle: document.getElementById("launch-state-title"),
  launchStateChip: document.getElementById("launch-state-chip"),
  launchStateCopy: document.getElementById("launch-state-copy"),
  recommendationList: document.getElementById("recommendation-list"),
  taskSearch: document.getElementById("task-search"),
  categoryFilters: document.getElementById("category-filters"),
  taskList: document.getElementById("task-list"),
  createForm: document.getElementById("create-form"),
  titleInput: document.getElementById("title-input"),
  categoryInput: document.getElementById("category-input"),
  durationInput: document.getElementById("duration-input"),
  energyInput: document.getElementById("energy-input"),
  tagsInput: document.getElementById("tags-input"),
  createStatePills: document.getElementById("create-state-pills"),
  aiGoalInput: document.getElementById("ai-goal-input"),
  aiBreakdownBtn: document.getElementById("ai-breakdown-btn"),
  aiResult: document.getElementById("ai-result")
};

function resolveApiBase() {
  const stored = window.localStorage.getItem(STORAGE_KEYS.apiBase);
  if (stored) {
    return stored.replace(/\/$/, "");
  }

  const configured = document.querySelector('meta[name="startify-api-base"]')?.content?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    return `${window.location.origin}/api`;
  }

  return "http://127.0.0.1:8000/api";
}

function nowIso() {
  return new Date().toISOString();
}

function dateKey(value) {
  return new Date(value).toLocaleDateString("sv-SE");
}

function makeId(prefix) {
  if (window.crypto?.randomUUID) {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeStateKey(state) {
  return STATE_OPTIONS.some((item) => item.key === state) ? state : "anxious";
}

function normalizeTask(task) {
  return {
    id: task.id || makeId("task"),
    title: task.title,
    category: task.category || "general",
    durationMin: Number(task.durationMin || 5),
    energyLevel: Number(task.energyLevel || 1),
    favorite: Boolean(task.favorite),
    source: task.source || "user",
    tags: Array.isArray(task.tags) ? task.tags : [],
    recommendedFor: Array.isArray(task.recommendedFor) ? task.recommendedFor : [],
    playCount: Number(task.playCount || 0),
    completedCount: Number(task.completedCount || 0),
    archived: Boolean(task.archived),
    createdAt: task.createdAt || nowIso(),
    updatedAt: task.updatedAt || nowIso()
  };
}

function createDefaultLocalState() {
  return {
    health: {
      projectName: "Startify Frontend",
      version: "0.4.0-frontend-local",
      databaseReady: true,
      databaseMode: "browser-local-storage",
      aiMode: "mock"
    },
    tasks: LOCAL_TASK_TEMPLATES.map((task) => normalizeTask(task)),
    sessions: []
  };
}

function loadLocalStore() {
  const stored = safeParse(window.localStorage.getItem(STORAGE_KEYS.localState) || "");
  if (!stored || !Array.isArray(stored.tasks) || !Array.isArray(stored.sessions)) {
    const initialState = createDefaultLocalState();
    window.localStorage.setItem(STORAGE_KEYS.localState, JSON.stringify(initialState));
    return initialState;
  }

  return {
    health: stored.health || createDefaultLocalState().health,
    tasks: stored.tasks.map((task) => normalizeTask(task)),
    sessions: stored.sessions.map((session) => ({
      id: session.id || makeId("session"),
      taskId: session.taskId,
      triggerState: session.triggerState || null,
      status: session.status || "in_progress",
      elapsedSec: Number(session.elapsedSec || 0),
      note: session.note || null,
      startedAt: session.startedAt || nowIso(),
      endedAt: session.endedAt || null
    }))
  };
}

function persistLocalStore() {
  if (!appState.localStore) return;
  window.localStorage.setItem(STORAGE_KEYS.localState, JSON.stringify(appState.localStore));
}

function ensureLocalStore() {
  if (!appState.localStore) {
    appState.localStore = loadLocalStore();
  }
  return appState.localStore;
}

function switchToLocalMode() {
  appState.dataMode = "local";
  ensureLocalStore();
}

function switchToRemoteMode() {
  appState.dataMode = "remote";
}

function isNetworkError(error) {
  const message = String(error || "");
  return error instanceof TypeError
    || /Failed to fetch|Load failed|NetworkError|fetch/i.test(message);
}

function compareTasksForRecommendation(a, b, stateKey) {
  return scoreTask(b, stateKey) - scoreTask(a, stateKey)
    || a.durationMin - b.durationMin
    || a.title.localeCompare(b.title, "zh-CN");
}

function scoreTask(task, stateKey) {
  let score = 0;
  if (task.recommendedFor?.includes(stateKey)) score += 6;
  if (task.favorite) score += 2;
  if (task.tags?.includes("clear-step")) score += 2;
  if (task.tags?.includes("no-prep")) score += 1;
  if (stateKey === "tired") score += 4 - task.energyLevel;
  if (stateKey === "ten_min") score += Math.max(0, 12 - task.durationMin);
  if (stateKey === "anxious") score += task.durationMin <= 5 ? 2 : 0;
  if (stateKey === "blank") score += task.tags?.includes("clear-step") ? 2 : 0;
  return score;
}

function buildLocalRecommendations(tasks, stateKey, limit) {
  const activeTasks = tasks.filter((task) => !task.archived);
  return activeTasks
    .slice()
    .sort((a, b) => compareTasksForRecommendation(a, b, stateKey))
    .slice(0, limit);
}

function buildLocalAiBreakdown(goal) {
  const compactGoal = goal.trim();
  return {
    goal: compactGoal,
    suggestionTitle: `先处理：${compactGoal.slice(0, 18)}`,
    durationMin: compactGoal.length > 18 ? 10 : 5,
    energyLevel: 1,
    reason: "当前是前端独立运行模式，先用本地拆解逻辑把任务缩成第一步。",
    steps: [
      `把“${compactGoal}”缩成一个 5 到 10 分钟就能开始的动作。`,
      "先打开相关文档、网页或工作区。",
      "只做第一步，先把启动完成。"
    ],
    source: "frontend-local"
  };
}

async function fetchJSON(path, options = {}) {
  const response = await fetch(`${appState.apiBase}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function requestJSON(path, options = {}) {
  if (appState.dataMode === "local") {
    return handleLocalRequest(path, options);
  }

  try {
    return await fetchJSON(path, options);
  } catch (error) {
    if (!isNetworkError(error)) {
      throw error;
    }
    switchToLocalMode();
    return handleLocalRequest(path, options);
  }
}

function parseRequestBody(options = {}) {
  if (!options.body) return {};
  if (typeof options.body === "string") {
    return safeParse(options.body) || {};
  }
  return options.body;
}

async function handleLocalRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const store = ensureLocalStore();
  const url = new URL(path, "http://local");
  const parts = url.pathname.split("/").filter(Boolean);
  const payload = parseRequestBody(options);

  if (url.pathname === "/health" && method === "GET") {
    return clone(store.health);
  }

  if (parts[0] === "tasks") {
    if (parts.length === 1 && method === "GET") {
      let tasks = store.tasks
        .filter((task) => !task.archived)
        .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.updatedAt.localeCompare(a.updatedAt));
      const category = url.searchParams.get("category");
      const favorite = url.searchParams.get("favorite");
      const search = (url.searchParams.get("search") || "").trim().toLowerCase();
      const limit = Number(url.searchParams.get("limit") || 50);

      if (category) {
        tasks = tasks.filter((task) => task.category === category);
      }
      if (favorite !== null && favorite !== "") {
        tasks = tasks.filter((task) => String(task.favorite) === favorite);
      }
      if (search) {
        tasks = tasks.filter((task) => {
          const haystack = [task.title, ...(task.tags || [])].join(" ").toLowerCase();
          return haystack.includes(search);
        });
      }
      return clone(tasks.slice(0, limit));
    }

    if (parts.length === 1 && method === "POST") {
      const createdAt = nowIso();
      const task = normalizeTask({
        ...payload,
        id: makeId("task"),
        createdAt,
        updatedAt: createdAt
      });
      store.tasks.unshift(task);
      persistLocalStore();
      return clone(task);
    }

    if (parts.length === 2) {
      const task = store.tasks.find((item) => item.id === parts[1] && !item.archived);
      if (!task) {
        throw new Error("Task not found.");
      }

      if (method === "GET") {
        return clone(task);
      }

      if (method === "PATCH") {
        Object.assign(task, payload, { updatedAt: nowIso() });
        persistLocalStore();
        return clone(task);
      }

      if (method === "DELETE") {
        task.archived = true;
        task.updatedAt = nowIso();
        persistLocalStore();
        return null;
      }
    }
  }

  if (parts[0] === "sessions") {
    if (parts.length === 1 && method === "GET") {
      let sessions = store.sessions
        .slice()
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      const taskId = url.searchParams.get("task_id");
      const status = url.searchParams.get("status");
      const limit = Number(url.searchParams.get("limit") || 50);

      if (taskId) {
        sessions = sessions.filter((item) => item.taskId === taskId);
      }
      if (status) {
        sessions = sessions.filter((item) => item.status === status);
      }
      return clone(sessions.slice(0, limit));
    }

    if (parts.length === 1 && method === "POST") {
      const task = store.tasks.find((item) => item.id === payload.taskId && !item.archived);
      if (!task) {
        throw new Error("Task not found.");
      }
      task.playCount += 1;
      task.updatedAt = nowIso();
      const session = {
        id: makeId("session"),
        taskId: payload.taskId,
        triggerState: payload.triggerState || null,
        status: "in_progress",
        elapsedSec: 0,
        note: payload.note || null,
        startedAt: nowIso(),
        endedAt: null
      };
      store.sessions.unshift(session);
      persistLocalStore();
      return clone(session);
    }

    if (parts.length === 2 && method === "GET") {
      const session = store.sessions.find((item) => item.id === parts[1]);
      if (!session) {
        throw new Error("Session not found.");
      }
      return clone(session);
    }

    if (parts.length === 3 && parts[2] === "finish" && method === "PATCH") {
      const session = store.sessions.find((item) => item.id === parts[1]);
      if (!session) {
        throw new Error("Session not found.");
      }
      if (session.status !== "in_progress") {
        throw new Error("Session is already finished.");
      }
      session.status = payload.status || "completed";
      session.endedAt = nowIso();
      session.elapsedSec = payload.elapsedSec ?? Math.max(0, Math.floor((new Date(session.endedAt) - new Date(session.startedAt)) / 1000));
      if (payload.note !== undefined) {
        session.note = payload.note;
      }

      if (session.status === "completed") {
        const task = store.tasks.find((item) => item.id === session.taskId && !item.archived);
        if (task) {
          task.completedCount += 1;
          task.updatedAt = nowIso();
        }
      }

      persistLocalStore();
      return clone(session);
    }
  }

  if (url.pathname === "/recommendations" && method === "GET") {
    const stateKey = normalizeStateKey(url.searchParams.get("state"));
    const limit = Number(url.searchParams.get("limit") || 4);
    return {
      state: stateKey,
      tasks: clone(buildLocalRecommendations(store.tasks, stateKey, limit)),
      generatedAt: nowIso()
    };
  }

  if (url.pathname === "/ai/breakdown" && method === "POST") {
    return buildLocalAiBreakdown(payload.goal || "");
  }

  throw new Error(`Unsupported local request: ${method} ${url.pathname}`);
}

function energyLabel(level) {
  if (level <= 1) return "低能量";
  if (level === 2) return "中能量";
  return "高能量";
}

function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category || "其他";
}

function prepareLabel(task) {
  return task.tags?.includes("no-prep") ? "无需准备" : "需要准备";
}

function formatDuration(min) {
  return `${min} 分钟`;
}

function formatTime(totalSec) {
  const min = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const sec = String(totalSec % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

function summarizeTask(task) {
  if (!task) {
    return "当前还没有可执行任务，可以先到添加页创建一个。";
  }

  const parts = [];
  if (task.tags?.includes("clear-step")) parts.push("步骤明确");
  if (task.favorite) parts.push("已收藏");
  if (task.playCount > 0) parts.push(`已启动 ${task.playCount} 次`);
  return parts.length > 0 ? parts.join(" · ") : "先做这一小步，把任务温和地启动起来。";
}

function recommendationCopy(stateKey) {
  const option = STATE_OPTIONS.find((item) => item.key === stateKey);
  return option ? option.desc : "根据当前状态，获得更容易开始的任务。";
}

function getTaskById(taskId) {
  return appState.tasks.find((task) => task.id === taskId)
    || appState.recommendations.find((task) => task.id === taskId)
    || null;
}

function getCurrentTask() {
  return getTaskById(appState.selectedTaskId) || appState.recommendations[0] || appState.tasks[0] || null;
}

function getNextTask() {
  const currentId = getCurrentTask()?.id;
  return appState.recommendations.find((task) => task.id !== currentId)
    || appState.tasks.find((task) => task.id !== currentId)
    || null;
}

function setApiStatus(text, kind = "warn") {
  elements.healthPill.textContent = text;
  elements.healthPill.className = `status-pill is-${kind}`;
}

function renderHeaderStats() {
  const today = dateKey(nowIso());
  const todaySessions = appState.sessions.filter((item) => dateKey(item.startedAt) === today);
  const completed = todaySessions.filter((item) => item.status === "completed").length;
  elements.todayStarted.textContent = String(todaySessions.length);
  elements.todayCompleted.textContent = String(completed);

  if (appState.dataMode === "local") {
    elements.apiTip.textContent = "当前为前端独立模式，数据保存在本地浏览器。";
  } else {
    elements.apiTip.textContent = `接口地址：${appState.apiBase}`;
  }
}

function renderPlayer() {
  const task = getCurrentTask();
  const nextTask = getNextTask();

  if (!task) {
    elements.currentTitle.textContent = "还没有任务";
    elements.currentCategory.textContent = "先创建一个";
    elements.currentSummary.textContent = "到添加页先写一个 2 到 5 分钟的小任务。";
    elements.currentDuration.textContent = "--";
    elements.currentEnergy.textContent = "--";
    elements.currentState.textContent = STATE_OPTIONS.find((item) => item.key === appState.selectedState)?.label || "默认";
    elements.prepareChip.textContent = "等待中";
    elements.favoriteCurrent.textContent = "收藏";
    elements.nextTitle.textContent = "暂无下一项";
    elements.nextSummary.textContent = "任务加载后，这里会出现下一项推荐。";
    elements.nextTags.innerHTML = "";
    renderTimer();
    return;
  }

  elements.currentTitle.textContent = task.title;
  elements.currentCategory.textContent = categoryLabel(task.category);
  elements.currentSummary.textContent = summarizeTask(task);
  elements.currentDuration.textContent = formatDuration(task.durationMin);
  elements.currentEnergy.textContent = energyLabel(task.energyLevel);
  elements.currentState.textContent =
    STATE_OPTIONS.find((item) => item.key === appState.selectedState)?.label || "默认";
  elements.prepareChip.textContent = prepareLabel(task);
  elements.favoriteCurrent.textContent = task.favorite ? "已收藏" : "收藏";

  if (appState.activeSessionId) {
    elements.timerCaption.textContent = appState.timerRunning ? "进行中" : "已暂停";
  } else {
    elements.timerCaption.textContent = "待开始";
  }

  if (nextTask) {
    elements.nextTitle.textContent = nextTask.title;
    elements.nextSummary.textContent = summarizeTask(nextTask);
    elements.nextTags.innerHTML = [
      `<span class="chip">${formatDuration(nextTask.durationMin)}</span>`,
      `<span class="chip">${energyLabel(nextTask.energyLevel)}</span>`,
      `<span class="chip">${categoryLabel(nextTask.category)}</span>`
    ].join("");
  } else {
    elements.nextTitle.textContent = "暂无下一项";
    elements.nextSummary.textContent = "完成当前动作后，可以到清单里手动选择别的任务。";
    elements.nextTags.innerHTML = "";
  }

  renderTimer();
}

function renderTimer() {
  const currentTask = getCurrentTask();
  const total = currentTask ? currentTask.durationMin * 60 : appState.timerTotalSec;
  const safeTotal = Math.max(total, 1);
  const progress = Math.max(0, Math.min(100, (appState.timerRemainingSec / safeTotal) * 100));
  document.documentElement.style.setProperty("--progress", `${progress}%`);
  elements.timerText.textContent = formatTime(appState.timerRemainingSec);
  elements.startToggle.textContent = appState.timerRunning ? "暂停" : (appState.activeSessionId ? "继续" : "开始");
}

function renderLaunch() {
  elements.stateGrid.innerHTML = STATE_OPTIONS.map((item) => `
    <button class="state-btn ${item.key === appState.selectedState ? "active" : ""}" data-state="${item.key}" type="button">
      <strong>${item.label}</strong>
      <span>${item.hint}</span>
    </button>
  `).join("");

  elements.launchStateTitle.textContent =
    STATE_OPTIONS.find((item) => item.key === appState.selectedState)?.label || "默认推荐";
  elements.launchStateChip.textContent = appState.selectedState;
  elements.launchStateCopy.textContent = recommendationCopy(appState.selectedState);

  if (appState.recommendations.length === 0) {
    elements.recommendationList.innerHTML = `<div class="empty-note">暂时没有推荐任务，可以去清单里选一个，或者先新增任务。</div>`;
    return;
  }

  elements.recommendationList.innerHTML = appState.recommendations.map((task) => `
    <article class="recommendation-item">
      <div class="recommendation-actions">
        <div>
          <strong>${task.title}</strong>
          <p>${categoryLabel(task.category)} · ${formatDuration(task.durationMin)} · ${energyLabel(task.energyLevel)}</p>
        </div>
        <button class="ghost-btn pick-recommendation" type="button" data-task-id="${task.id}">使用</button>
      </div>
    </article>
  `).join("");
}

function filteredTasks() {
  const keyword = appState.search.trim().toLowerCase();
  return appState.tasks.filter((task) => {
    const matchCategory = appState.listFilter === "all" || task.category === appState.listFilter;
    const searchBase = [task.title, ...(task.tags || [])].join(" ").toLowerCase();
    const matchSearch = !keyword || searchBase.includes(keyword);
    return matchCategory && matchSearch;
  });
}

function renderList() {
  const categories = ["all", ...new Set(appState.tasks.map((task) => task.category))];
  elements.categoryFilters.innerHTML = categories.map((category) => `
    <button class="filter-chip ${category === appState.listFilter ? "active" : ""}" data-category="${category}" type="button">
      ${categoryLabel(category)}
    </button>
  `).join("");

  const tasks = filteredTasks();
  if (tasks.length === 0) {
    elements.taskList.innerHTML = `<div class="empty-note">当前筛选条件下没有任务，可以换个分类，或者自己添加一个。</div>`;
    return;
  }

  elements.taskList.innerHTML = tasks.map((task) => `
    <article class="task-row">
      <div class="task-row-top">
        <div>
          <strong>${task.title}</strong>
          <p>${categoryLabel(task.category)} · ${formatDuration(task.durationMin)} · ${energyLabel(task.energyLevel)}</p>
        </div>
        <button class="task-action ${task.favorite ? "favorite" : ""}" type="button" data-favorite-id="${task.id}">
          ${task.favorite ? "已收藏" : "收藏"}
        </button>
      </div>
      <div class="tag-row">
        ${(task.tags || []).slice(0, 3).map((tag) => `<span class="chip">${tag}</span>`).join("")}
        <span class="chip">已开始 ${task.playCount}</span>
        <span class="chip">已完成 ${task.completedCount}</span>
      </div>
      <div class="action-grid" style="margin-top:12px;">
        <button class="main-btn choose-task" type="button" data-task-id="${task.id}">立即开始</button>
        <button class="soft-btn delete-task" type="button" data-delete-id="${task.id}">归档</button>
      </div>
    </article>
  `).join("");
}

function renderCreateStates() {
  elements.createStatePills.innerHTML = STATE_OPTIONS.map((item) => `
    <button class="filter-chip ${appState.createStates.includes(item.key) ? "active" : ""}" type="button" data-create-state="${item.key}">
      ${item.label}
    </button>
  `).join("");
}

function renderAll() {
  renderHeaderStats();
  renderPlayer();
  renderLaunch();
  renderList();
  renderCreateStates();
}

function switchScreen(target) {
  appState.currentScreen = target;
  elements.screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === target);
  });
  elements.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.target === target);
  });
}

function resetTimerForTask(task) {
  clearInterval(appState.timerIntervalId);
  appState.timerIntervalId = null;
  appState.timerRunning = false;
  appState.activeSessionId = null;
  appState.lastTickAt = null;
  appState.timerTotalSec = (task?.durationMin || 2) * 60;
  appState.timerRemainingSec = appState.timerTotalSec;
  renderTimer();
}

function startLocalTimer() {
  if (appState.timerRunning) return;
  appState.timerRunning = true;
  appState.lastTickAt = Date.now();
  appState.timerIntervalId = window.setInterval(() => {
    const now = Date.now();
    const diff = Math.floor((now - appState.lastTickAt) / 1000);
    if (diff <= 0) return;
    appState.lastTickAt = now;
    appState.timerRemainingSec = Math.max(0, appState.timerRemainingSec - diff);
    renderTimer();

    if (appState.timerRemainingSec <= 0) {
      finishTaskSession("completed").catch(console.error);
    }
  }, 250);
  renderPlayer();
}

function pauseLocalTimer() {
  appState.timerRunning = false;
  clearInterval(appState.timerIntervalId);
  appState.timerIntervalId = null;
  renderPlayer();
}

async function loadHealth() {
  const payload = await requestJSON("/health");
  appState.health = payload;
  const mode = payload.databaseMode || payload.database_mode;

  if (appState.dataMode === "local" || mode === "browser-local-storage") {
    setApiStatus("本地模式", "warn");
    return;
  }

  const pillText = mode === "sqlite-file" ? "已连接" : "内存模式";
  setApiStatus(pillText, mode === "sqlite-file" ? "ok" : "warn");
}

async function loadTasks() {
  appState.tasks = await requestJSON("/tasks");
}

async function loadRecommendations() {
  const payload = await requestJSON(`/recommendations?state=${encodeURIComponent(appState.selectedState)}&limit=4`);
  appState.recommendations = payload.tasks || [];
}

async function loadSessions() {
  appState.sessions = await requestJSON("/sessions?limit=50");
}

function ensureSelectedTask() {
  const exists = getTaskById(appState.selectedTaskId);
  if (exists) return;
  const fallback = appState.recommendations[0] || appState.tasks[0] || null;
  appState.selectedTaskId = fallback?.id || null;
  resetTimerForTask(fallback);
}

async function refreshApp() {
  try {
    if (appState.dataMode === "local") {
      switchToRemoteMode();
    }
    await Promise.all([loadHealth(), loadTasks(), loadRecommendations(), loadSessions()]);
    ensureSelectedTask();
    renderAll();
  } catch (error) {
    console.error(error);
    switchToLocalMode();
    await Promise.all([loadHealth(), loadTasks(), loadRecommendations(), loadSessions()]);
    ensureSelectedTask();
    renderAll();
  }
}

async function toggleCurrentFavorite() {
  const task = getCurrentTask();
  if (!task) return;
  await requestJSON(`/tasks/${task.id}`, {
    method: "PATCH",
    body: JSON.stringify({ favorite: !task.favorite })
  });
  await Promise.all([loadTasks(), loadRecommendations()]);
  renderAll();
}

async function startOrPauseTask() {
  const task = getCurrentTask();
  if (!task) return;

  if (appState.timerRunning) {
    pauseLocalTimer();
    return;
  }

  if (!appState.activeSessionId) {
    const session = await requestJSON("/sessions", {
      method: "POST",
      body: JSON.stringify({
        taskId: task.id,
        triggerState: appState.selectedState
      })
    });
    appState.activeSessionId = session.id;
  }

  startLocalTimer();
}

async function finishTaskSession(status) {
  const task = getCurrentTask();
  if (!task) return;

  if (appState.activeSessionId) {
    const elapsedSec = Math.max(appState.timerTotalSec - appState.timerRemainingSec, 0);
    await requestJSON(`/sessions/${appState.activeSessionId}/finish`, {
      method: "PATCH",
      body: JSON.stringify({ status, elapsedSec })
    });
  }

  pauseLocalTimer();
  appState.activeSessionId = null;
  resetTimerForTask(getNextTask() || task);

  await Promise.all([loadTasks(), loadRecommendations(), loadSessions()]);
  if (status !== "abandoned") {
    const next = getNextTask() || appState.recommendations[0] || appState.tasks[0];
    if (next) {
      appState.selectedTaskId = next.id;
      resetTimerForTask(next);
    }
  }
  renderAll();
}

async function chooseTask(taskId, screen = "player") {
  const task = getTaskById(taskId);
  if (!task) return;
  appState.selectedTaskId = taskId;
  resetTimerForTask(task);
  renderAll();
  switchScreen(screen);
}

async function deleteTask(taskId) {
  await requestJSON(`/tasks/${taskId}`, { method: "DELETE" });
  if (appState.selectedTaskId === taskId) {
    appState.selectedTaskId = null;
  }
  await Promise.all([loadTasks(), loadRecommendations()]);
  ensureSelectedTask();
  renderAll();
}

async function createTask(event) {
  event.preventDefault();
  const title = elements.titleInput.value.trim();
  if (!title) return;

  const tags = elements.tagsInput.value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const payload = {
    title,
    category: elements.categoryInput.value,
    durationMin: Number(elements.durationInput.value),
    energyLevel: Number(elements.energyInput.value),
    favorite: false,
    source: appState.dataMode === "local" ? "frontend-local" : "user",
    tags,
    recommendedFor: appState.createStates
  };

  const task = await requestJSON("/tasks", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  elements.createForm.reset();
  appState.createStates = ["anxious"];
  appState.aiSuggestion = null;
  elements.aiResult.textContent = "任务已创建。";
  await Promise.all([loadTasks(), loadRecommendations()]);
  appState.selectedTaskId = task.id;
  resetTimerForTask(task);
  renderAll();
  switchScreen("player");
}

async function runAiBreakdown() {
  const goal = elements.aiGoalInput.value.trim();
  if (!goal) {
    elements.aiResult.textContent = "请先输入一个较大的任务目标。";
    return;
  }

  elements.aiResult.textContent = "正在生成...";
  try {
    let payload;
    try {
      payload = await fetchJSON("/ai/breakdown", {
        method: "POST",
        body: JSON.stringify({ goal })
      });
    } catch (apiError) {
      console.warn("AI API unavailable; using the labeled browser demo.", apiError);
      payload = await handleLocalRequest("/ai/breakdown", {
        method: "POST",
        body: JSON.stringify({ goal })
      });
    }
    appState.aiSuggestion = payload;
    elements.titleInput.value = payload.suggestionTitle;
    elements.durationInput.value = String(payload.durationMin);
    elements.energyInput.value = String(payload.energyLevel);
    elements.tagsInput.value = "clear-step";
    const source = String(payload.source || "");
    const sourceLabel = source.startsWith("api:")
      ? "大模型 API"
      : source === "mock"
        ? "规则演示"
        : "浏览器演示";
    elements.aiResult.textContent = `${payload.suggestionTitle} · ${payload.steps?.[0] || ""} · ${sourceLabel}`;
  } catch (error) {
    console.error(error);
    elements.aiResult.textContent = "AI 拆解失败。";
  }
}

function bindEvents() {
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => switchScreen(button.dataset.target));
  });

  elements.refreshBtn.addEventListener("click", () => {
    refreshApp().catch(console.error);
  });

  elements.favoriteCurrent.addEventListener("click", () => {
    toggleCurrentFavorite().catch(console.error);
  });

  elements.startToggle.addEventListener("click", () => {
    startOrPauseTask().catch(console.error);
  });

  elements.completeTask.addEventListener("click", () => {
    finishTaskSession("completed").catch(console.error);
  });

  elements.skipTask.addEventListener("click", () => {
    finishTaskSession("skipped").catch(console.error);
  });

  elements.useNextTask.addEventListener("click", () => {
    const nextTask = getNextTask();
    if (nextTask) chooseTask(nextTask.id, "player").catch(console.error);
  });

  elements.stateGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-state]");
    if (!button) return;
    appState.selectedState = button.dataset.state;
    loadRecommendations()
      .then(() => {
        ensureSelectedTask();
        renderAll();
      })
      .catch(console.error);
  });

  elements.recommendationList.addEventListener("click", (event) => {
    const button = event.target.closest(".pick-recommendation");
    if (!button) return;
    chooseTask(button.dataset.taskId, "player").catch(console.error);
  });

  elements.taskSearch.addEventListener("input", (event) => {
    appState.search = event.target.value;
    renderList();
  });

  elements.categoryFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    appState.listFilter = button.dataset.category;
    renderList();
  });

  elements.taskList.addEventListener("click", (event) => {
    const favoriteBtn = event.target.closest("[data-favorite-id]");
    const chooseBtn = event.target.closest("[data-task-id]");
    const deleteBtn = event.target.closest("[data-delete-id]");

    if (favoriteBtn) {
      requestJSON(`/tasks/${favoriteBtn.dataset.favoriteId}`, {
        method: "PATCH",
        body: JSON.stringify({
          favorite: !getTaskById(favoriteBtn.dataset.favoriteId)?.favorite
        })
      })
        .then(() => Promise.all([loadTasks(), loadRecommendations()]))
        .then(() => renderAll())
        .catch(console.error);
      return;
    }

    if (chooseBtn) {
      chooseTask(chooseBtn.dataset.taskId, "player").catch(console.error);
      return;
    }

    if (deleteBtn) {
      deleteTask(deleteBtn.dataset.deleteId).catch(console.error);
    }
  });

  elements.createStatePills.addEventListener("click", (event) => {
    const button = event.target.closest("[data-create-state]");
    if (!button) return;
    const key = button.dataset.createState;
    if (appState.createStates.includes(key)) {
      appState.createStates = appState.createStates.filter((item) => item !== key);
    } else {
      appState.createStates = [...appState.createStates, key];
    }
    if (appState.createStates.length === 0) {
      appState.createStates = ["anxious"];
    }
    renderCreateStates();
  });

  elements.createForm.addEventListener("submit", (event) => {
    createTask(event).catch(console.error);
  });

  elements.aiBreakdownBtn.addEventListener("click", () => {
    runAiBreakdown().catch(console.error);
  });
}

bindEvents();
refreshApp().catch(console.error);
