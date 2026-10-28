// Vercel entry (see vercel.json). Locally it also starts a listener.
//
// If the app can't start (typically a missing or malformed environment variable), answer every request
// with a JSON error that names the offending variables instead of a bare platform crash page.
let app;
let port = 5000;

try {
  const [{ default: realApp }, { env }] = await Promise.all([import("./src/app.js"), import("./src/config/env.js")]);
  app = realApp;
  port = env.PORT;
} catch (err) {
  console.error("PayNode API failed to start:", err);
  app = (req, res) => {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: { code: "STARTUP_FAILED", message: "The API failed to start.", ...(err.fields && { invalid: err.fields }) } }));
  };
}

if (!process.env.VERCEL) {
  const { createServer } = await import("node:http");
  createServer(app).listen(port, () => console.log(`PayNode API running on http://localhost:${port}`));
}

export default app;
