const jsonResponse = (status, body) => ({
  statusCode: status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  },
  body: JSON.stringify(body)
});

const parseModelJson = (content) => {
  const match = String(content || "").match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Model JSON was not found");
  return JSON.parse(match[0]);
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { detail: "Method not allowed" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { detail: "请求格式无效" });
  }

  const goal = String(payload.goal || "").trim();
  if (!goal || goal.length > 200) {
    return jsonResponse(422, { detail: "目标长度需要在 1 到 200 个字符之间" });
  }

  const apiKey = process.env.STARTIFY_LLM_API_KEY;
  const baseUrl = String(process.env.STARTIFY_LLM_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.STARTIFY_LLM_MODEL || "deepseek-v4-flash";
  const timeoutMs = Math.max(1000, Number(process.env.STARTIFY_LLM_TIMEOUT_SECONDS || 30) * 1000);
  if (!apiKey || !baseUrl || !model) {
    return jsonResponse(503, { detail: "在线大模型尚未配置" });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const requestBody = {
      model,
      temperature: 0.2,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content: "你是 Startify 的任务启动助手。把模糊目标缩成一个 5 到 10 分钟内能开始的动作。只返回 JSON。"
        },
        {
          role: "user",
          content: `JSON 字段固定为 suggestionTitle、durationMin、energyLevel、reason、steps。\n目标：${goal}`
        }
      ]
    };
    if (baseUrl.includes("api.deepseek.com")) {
      requestBody.thinking = { type: "disabled" };
      requestBody.response_format = { type: "json_object" };
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    if (!response.ok) {
      return jsonResponse(502, { detail: "大模型服务暂时不可用" });
    }

    const providerPayload = await response.json();
    const parsed = parseModelJson(providerPayload?.choices?.[0]?.message?.content);
    const steps = Array.isArray(parsed.steps)
      ? parsed.steps.map((step) => String(step).trim()).filter(Boolean).slice(0, 5)
      : [];
    if (!parsed.suggestionTitle || !parsed.reason || steps.length === 0) {
      throw new Error("Model payload is incomplete");
    }

    return jsonResponse(200, {
      goal,
      suggestionTitle: String(parsed.suggestionTitle).slice(0, 200),
      durationMin: Math.min(30, Math.max(1, Number(parsed.durationMin) || 5)),
      energyLevel: Math.min(3, Math.max(1, Number(parsed.energyLevel) || 1)),
      reason: String(parsed.reason),
      steps,
      source: `api:${model}`
    });
  } catch (error) {
    console.error("Startify AI breakdown failed", error);
    return jsonResponse(502, { detail: "大模型返回格式无效" });
  } finally {
    clearTimeout(timeoutId);
  }
};
