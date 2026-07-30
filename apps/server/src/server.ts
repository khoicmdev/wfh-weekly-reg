import cors from "cors";
import express, { type Request, type Response } from "express";

const app = express();
app.use(cors());
app.use(express.json());

// --- STATUS ENDPOINT ---
app.get("/api/status", (req: Request, res: Response) => {
  res.json({ status: `Server is running: ${new Date().toISOString()}` });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(
    `       \nExpressJS started at ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}\n`,
  );
  console.log(`       -> Local: http://localhost:${PORT}\n`);
});
