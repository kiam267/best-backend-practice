import multer from "multer";

const storage = multer.diskStorage({
     destination: function (req, file, fn) {
          fn(null, "./public/temp/");
     },
     filename: function (req, file, fn) {
          fn(null, Date.now() + "-" + file.originalname);
     },
});

const upload = multer({ storage: storage });


export { upload };
