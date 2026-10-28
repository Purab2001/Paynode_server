// Vercel entry (see vercel.json). Locally it also starts a listener.
import app from "./src/app.js";
import { env } from "./src/config/env.js";

if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`PayNode API running on http://localhost:${env.PORT}`);
  });
}

export default app;
