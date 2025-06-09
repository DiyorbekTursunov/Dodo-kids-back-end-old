import { Request, Response } from "express";
import { PrismaClient, FileType } from "@prisma/client";
import multer from "multer";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();

// Define a consistent uploads directory
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    console.log("Upload directory:", UPLOADS_DIR);
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// File filter function
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  const allowedDocumentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (
    allowedImageTypes.includes(file.mimetype) ||
    allowedDocumentTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images and documents are allowed."));
  }
};

// Configure multer upload
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
  },
});

// Determine file type based on mimetype
const getFileType = (mimeType: string): FileType => {
  if (mimeType.startsWith("image/")) {
    return FileType.IMAGE;
  } else if (
    mimeType === "application/pdf" ||
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return FileType.DOCUMENT;
  } else {
    return FileType.OTHER;
  }
};

// Helper function to get absolute file path
const getAbsoluteFilePath = (filename: string): string => {
  return path.join(UPLOADS_DIR, filename);
};

// Helper function to generate file URL
const generateFileUrl = (req: Request, fileId: string): string => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/api/files/${fileId}/download`;
};

// Helper function to generate static file URL
const generateStaticFileUrl = (req: Request, fileName: string): string => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/uploads/${fileName}`;
};

// Controller methods
export const uploadFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const { productId } = req.body;

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }
    }

    // Store just the filename, not the full path
    const file = await prisma.file.create({
      data: {
        filename: req.file.originalname,
        path: req.file.filename, // Store just the filename
        // mimeType: req.file.mimetype,
        // size: req.file.size,
        // fileType: getFileType(req.file.mimetype),
      },
    });

    const fileWithUrls = {
      ...file,
      path: generateStaticFileUrl(req, req.file.filename),
      url: generateFileUrl(req, file.id),
      staticUrl: generateStaticFileUrl(req, req.file.filename),
    };

    res.status(201).json({
      message: "File uploaded successfully",
      file: fileWithUrls,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: (error as Error).message,
    });
  }
};

export const uploadMultipleFiles = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      res.status(400).json({ message: "No files uploaded" });
      return;
    }

    const { productId } = req.body;

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }
    }

    const files = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files).flat();

    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        return prisma.file.create({
          data: {
            filename: file.originalname,
            path: file.filename, // Store just the filename
            // mimeType: file.mimetype,
            // size: file.size,
            // fileType: getFileType(file.mimetype),
          },
        });
      })
    );

    const filesWithUrls = uploadedFiles.map((file, index) => ({
      ...file,
      path: generateStaticFileUrl(req, files[index].filename),
      url: generateFileUrl(req, file.id),
      staticUrl: generateStaticFileUrl(req, files[index].filename),
    }));

    res.status(201).json({
      message: "Files uploaded successfully",
      files: filesWithUrls,
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: (error as Error).message,
    });
  }
};

export const getAllFiles = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = "1", limit = "10", fileType, search } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const where: any = {};

    if (fileType && fileType !== "ALL") {
      where.fileType = fileType as FileType;
    }

    if (search) {
      where.fileName = {
        contains: search as string,
        mode: "insensitive",
      };
    }

    const [files, totalCount] = await Promise.all([
      prisma.file.findMany({
        where,
        skip: offset,
        take: limitNum,
      }),
      prisma.file.count({ where }),
    ]);

    const filesWithUrls = files.map((file) => ({
      ...file,
      url: generateFileUrl(req, file.id),
      staticUrl: generateStaticFileUrl(req, file.path), // file.path now contains just the filename
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      files: filesWithUrls,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: (error as Error).message,
    });
  }
};

export const getFileById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const file = await prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    const fileWithUrls = {
      ...file,
      path: generateStaticFileUrl(req, file.path), // file.path now contains just the filename
      url: generateFileUrl(req, file.id),
      staticUrl: generateStaticFileUrl(req, file.path),
    };

    res.status(200).json(fileWithUrls);
  } catch (error) {
    console.error("Error fetching file:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: (error as Error).message,
    });
  }
};

export const downloadFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const file = await prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    // Use the helper function to get absolute path
    const absolutePath = getAbsoluteFilePath(file.path);

    console.log("Attempting to serve file:", {
      id: file.id,
      filename: file.path,
      absolutePath,
      uploadsDir: UPLOADS_DIR,
      exists: fs.existsSync(absolutePath),
    });

    if (!fs.existsSync(absolutePath)) {
      console.error("File not found on filesystem:", absolutePath);
      res.status(404).json({
        message: "File not found on server",
        fileName: file.path,
        filePath: absolutePath,
        uploadsDir: UPLOADS_DIR,
        uploadsExists: fs.existsSync(UPLOADS_DIR),
      });
      return;
    }

    const fileStream = fs.createReadStream(absolutePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: (error as Error).message,
    });
  }
};

export const deleteFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const file = await prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    const absolutePath = getAbsoluteFilePath(file.path);

    fs.unlink(absolutePath, async (err) => {
      if (err) {
        console.error("Error deleting file from filesystem:", err);
      }

      await prisma.file.delete({
        where: { id },
      });

      res.status(200).json({ message: "File deleted successfully" });
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: (error as Error).message,
    });
  }
};

// Additional route handler for serving static files directly
export const serveStaticFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { filename } = req.params;
    const absolutePath = getAbsoluteFilePath(filename);

    console.log("Serving static file:", {
      filename,
      absolutePath,
      exists: fs.existsSync(absolutePath),
    });

    if (!fs.existsSync(absolutePath)) {
      res.status(404).json({
        message: "File not found",
        fileName: filename,
        filePath: absolutePath,
        uploadsDir: UPLOADS_DIR,
        uploadsExists: fs.existsSync(UPLOADS_DIR),
      });
      return;
    }

    // Get file stats to determine content type and size
    const stats = fs.statSync(absolutePath);
    const ext = path.extname(filename).toLowerCase();

    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".pdf") contentType = "application/pdf";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", stats.size);

    if (contentType.startsWith("image/")) {
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    }

    const fileStream = fs.createReadStream(absolutePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error serving static file:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: (error as Error).message,
    });
  }
};
