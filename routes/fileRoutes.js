const express = require('express')
const router = express.Router()
const multer = require('multer');
const authenticateToken = require('../middleware/authMiddleware');
const {fileUpload, getFileList, deleteFile, 
  getFile, downloadFile, updateFile} = require('../controllers/fileController')

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// upload file
router.post('/upload', [upload.single('file'), authenticateToken], fileUpload)

// get all files
router.get('/list', authenticateToken, getFileList)

// get file by id
router.get('/:id', authenticateToken, getFile)

// delete file by id
router.delete('/delete/:id', authenticateToken, deleteFile)

// download file by id
router.get('/download/:id', authenticateToken, downloadFile)

// update file by id
router.put('/update/:id', [upload.single('file'), authenticateToken], updateFile)

module.exports = router