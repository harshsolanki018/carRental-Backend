const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');
const asyncHandler = require('../utils/async-handler');
const HttpError = require('../utils/http-error');

function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'car2go/cars',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

const uploadCarImage = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw new HttpError(400, 'Please upload an image file.');
  }

  const result = await uploadBufferToCloudinary(req.file.buffer);

  res.json({
    success: true,
    message: 'Image uploaded successfully.',
    data: {
      url: result.secure_url,
      publicId: result.public_id,
    },
  });
});

module.exports = {
  uploadCarImage,
};
