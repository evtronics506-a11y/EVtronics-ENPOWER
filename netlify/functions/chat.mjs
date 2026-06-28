// netlify/functions/chat.mjs
// Proxy seguro hacia la API de Anthropic + verificación de contraseña.
// La API key y la contraseña viven en variables de entorno de Netlify (no en el repo).

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const { system, messages, password, verify } = JSON.parse(event.body || "{}");

    // 1) Verificación de contraseña (protege el gasto de API).
    //    Si APP_PASSWORD no está configurada en Netlify, no se exige clave.
    if (process.env.APP_PASSWORD && password !== process.env.APP_PASSWORD) {
      return { statusCode: 401, body: JSON.stringify({ error: "Contraseña incorrecta." }) };
    }

    // 2) Si solo se está verificando el login, responder sin gastar tokens.
    if (verify) {
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // 3) Consulta real a la IA.
    if (!process.env.ANTHROPIC_API_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: "Falta ANTHROPIC_API_KEY en Netlify." }) };
    }
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system,
        messages,
      }),
    });
    const data = await r.json();
    return {
      statusCode: r.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
