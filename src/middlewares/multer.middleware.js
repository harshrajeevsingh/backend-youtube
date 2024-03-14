import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, res, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage: storage });

// for refrence: read- https://github.com/expressjs/multer
// We are passing the file on server storage temp here, and then use cloudinary to upload it.
