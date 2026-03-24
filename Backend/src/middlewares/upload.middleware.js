const multer = require('multer');
const HttpError = require('../utils/http-error');

const MAX_IMAGE_SIZE_MB = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      cb(new HttpError(400, 'Only image files are allowed.'));
      return;
    }
    cb(null, true);
  },
});

function uploadSingleImage(field) {
  const handler = upload.single(field);
  return (req, res, next) => {
    handler(req, res, (err) => {
      if (!err) {
        next();
        return;
      }

      if (err instanceof HttpError) {
        next(err);
        return;
      }

      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          next(new HttpError(400, `Image must be <= ${MAX_IMAGE_SIZE_MB}MB.`));
          return;
        }
        next(new HttpError(400, 'Invalid image upload request.'));
        return;
      }

      next(new HttpError(400, 'Failed to upload image.'));
    });
  };
}

module.exports = {
  uploadSingleImage,
};
