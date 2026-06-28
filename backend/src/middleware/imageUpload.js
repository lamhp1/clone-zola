import multer from "multer";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const messageImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 10
  },
  fileFilter(_req, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error("Only jpg, jpeg, png, webp and gif images are allowed"));
      return;
    }

    callback(null, true);
  }
});

export function uploadMessageImages(req, res, next) {
  messageImageUpload.array("images", 10)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Each image must be 5MB or smaller"
          : "Could not upload the selected images";
      res.status(400).json({ message });
      return;
    }

    res.status(400).json({ message: error.message || "Invalid image upload" });
  });
}
