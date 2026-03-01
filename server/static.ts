import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  
  // In production, the server is at dist/index.cjs, so __dirname is /home/runner/workspace/dist
  // The client build is also in dist/public
  
  if (!fs.existsSync(distPath)) {
    console.warn(`Static directory not found at ${distPath}. This might be expected during build or if client hasn't been built.`);
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
