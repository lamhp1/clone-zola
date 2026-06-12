import express from "express";

export const healthRoutes = express.Router();

healthRoutes.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "clone-zola-backend"
  });
});
