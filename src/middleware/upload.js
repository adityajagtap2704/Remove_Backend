const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create upload directories
const uploadDirs = {
  profiles: 'uploads/profiles',
  vehicles: 'uploads/vehicles',
  documents: 'uploads/documents',
  temp: 'uploads/temp'
};

Object.values(uploadDirs).forEach(ensureDirectoryExists);

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadDirs.temp;

    // Determine upload path based on fieldname or route
    if (file.fieldname === 'profileImage' || file.fieldname === 'avatar') {
      uploadPath = uploadDirs.profiles;
    } else if (file.fieldname === 'vehicleImage' || file.fieldname === 'cabImage') {
      uploadPath = uploadDirs.vehicles;
    } else if (file.fieldname === 'document' || file.fieldname === 'license' || file.fieldname === 'insurance') {
      uploadPath = uploadDirs.documents;
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    
    cb(null, `${baseName}-${uniqueSuffix}${extension}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedDocumentTypes = /pdf|doc|docx/;
  
  const extname = allowedImageTypes.test(path.extname(file.originalname).toLowerCase()) ||
                  allowedDocumentTypes.test(path.extname(file.originalname).toLowerCase());
  
  const mimetype = /image\/(jpeg|jpg|png|gif|webp)|application\/(pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document)/.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and documents (PDF, DOC, DOCX) are allowed.'));
  }
};

// Base multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: fileFilter
});

// Specific upload configurations
const uploadConfigs = {
  // Single file uploads
  single: (fieldName) => upload.single(fieldName),
  
  // Profile image upload
  profileImage: upload.single('profileImage'),
  
  // Vehicle/Cab image upload
  vehicleImage: upload.single('vehicleImage'),
  
  // Document uploads
  document: upload.single('document'),
  
  // Multiple files upload
  multiple: (fieldName, maxCount = 5) => upload.array(fieldName, maxCount),
  
  // Mixed uploads for driver registration
  driverDocuments: upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'license', maxCount: 1 },
    { name: 'vehicleImage', maxCount: 1 },
    { name: 'insurance', maxCount: 1 }
  ]),
  
  // Mixed uploads for cab management
  cabDocuments: upload.fields([
    { name: 'cabImage', maxCount: 1 },
    { name: 'registration', maxCount: 1 },
    { name: 'insurance', maxCount: 1 }
  ])
};

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum allowed is 5.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name for file upload.'
      });
    }
  }
  
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  next(err);
};

// Cleanup temporary files
const cleanupTempFiles = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Clean up uploaded files on error responses
    if (res.statusCode >= 400 && req.files) {
      const filesToDelete = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
      
      filesToDelete.forEach(file => {
        if (file && file.path) {
          fs.unlink(file.path, (err) => {
            if (err) console.error('Error deleting temp file:', err);
          });
        }
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Utility function to get file URL
const getFileUrl = (filename, type = 'temp') => {
  if (!filename) return null;
  
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
  return `${baseUrl}/uploads/${type}/${filename}`;
};

// Utility function to delete file
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

module.exports = {
  upload: uploadConfigs,
  handleUploadError,
  cleanupTempFiles,
  getFileUrl,
  deleteFile,
  uploadDirs
};