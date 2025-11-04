import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    // TEMPORARILY DISABLE HMR - it's causing reload loops
    hmr: false,
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        // Don't exit on error - just log it to prevent server crashes
        viteLogger.error(msg, options);
        // Don't call process.exit(1) here - it causes reload loops
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  // Wrap Vite middleware to skip API routes
  // Vite middleware must not process API routes - they should be handled by registerRoutes
  app.use((req, res, next) => {
    // Explicitly skip API routes - let them be handled by routes.ts
    const isApiRoute = req.path?.startsWith("/api") || 
                      req.originalUrl?.startsWith("/api") || 
                      req.url?.startsWith("/api");
    
    if (isApiRoute) {
      // Skip Vite middleware entirely for API routes
      return next();
    }
    
    // For non-API routes, apply Vite middleware
    // vite.middlewares is a Connect-compatible middleware stack
    vite.middlewares(req, res, next);
  });
  
  // Only handle non-API routes - API routes should be handled by registerRoutes
  app.use("*", async (req, res, next) => {
    // Skip API routes - let them be handled by the API routes
    if (req.originalUrl?.startsWith("/api")) {
      return next();
    }
    
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (but skip API routes)
  app.use("*", (req, res, next) => {
    // Skip API routes - let them be handled by the API routes
    if (req.originalUrl?.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
