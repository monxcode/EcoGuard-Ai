import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { config, geminiConfigured } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { metaRouter } from "./routes/meta";
import { dashboardRouter } from "./routes/dashboard";
import { intelligenceRouter } from "./routes/intelligence";
import { assistantRouter } from "./routes/assistant";
import { wasteRouter } from "./routes/waste";
import { routesRouter } from "./routes/greenRoutes";
import { reportsRouter } from "./routes/reports";
import { isDemoMode } from "./tools/demoState";

const app = express();
app.use(express.json({ limit: "8mb" }));

app.use("/api", metaRouter);
app.use("/api", dashboardRouter);
app.use("/api", intelligenceRouter);
app.use("/api", assistantRouter);
app.use("/api", wasteRouter);
app.use("/api", routesRouter);
app.use("/api", reportsRouter);
app.use("/api", notFoundHandler);

// Production: serve the built SPA from dist/ when present.
const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, "..", "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(distDir, "index.html"));
  });
}

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(
    `[ecoguard] API listening on http://localhost:${config.port} ` +
      `(provider=${config.preferredProvider}, demoMode=${isDemoMode()}, gemini=${geminiConfigured ? "configured" : "off"})`,
  );
});
