import { Router, Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { sdk } from "./_core/sdk";

const router = Router();

// Use memory storage so we can pipe to S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// POST /api/upload/template
// Requires admin role; uploads file to S3 and returns { fileUrl, fileKey }
router.post(
  "/template",
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      // Auth check
      let user = null;
      try { user = await sdk.authenticateRequest(req); } catch { user = null; }
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: admins only" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Build a unique S3 key
      const suffix = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileKey = `templates/${suffix}-${safeName}`;

      // Upload to S3
      const { url } = await storagePut(fileKey, file.buffer, file.mimetype);

      return res.json({ fileUrl: url, fileKey });
    } catch (err: any) {
      console.error("[upload/template]", err);
      return res.status(500).json({ error: err.message ?? "Upload failed" });
    }
  }
);

export default router;
