/**
 * Lambda handler for the Next.js frontend using the standalone output mode.
 * This wraps the Next.js server for Lambda execution.
 */

import http, { createServer } from "http";
import { parse } from "url";

let app;

async function initApp() {
  if (!app) {
    const next = (await import("next")).default;
    app = next({ dev: false, dir: process.env.LAMBDA_TASK_ROOT });
    await app.prepare();
  }
  return app;
}

export async function handler(event, context) {
  const nextApp = await initApp();
  const handle = nextApp.getRequestHandler();

  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    server.listen(0, () => {
      const port = server.address().port;
      const url = `http://localhost:${port}${event.rawPath || "/"}`;

      const options = {
        hostname: "localhost",
        port,
        path: event.rawPath || "/",
        method: event.requestContext?.http?.method || "GET",
        headers: event.headers || {},
      };

      const req = http.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          server.close();
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body,
            isBase64Encoded: false,
          });
        });
      });

      req.on("error", (err) => {
        server.close();
        reject(err);
      });

      if (event.body) {
        req.write(event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body);
      }
      req.end();
    });
  });
}
