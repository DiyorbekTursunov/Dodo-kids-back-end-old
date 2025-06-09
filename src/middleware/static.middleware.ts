// middleware/static.middleware.ts
import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";

// Static files middleware
export const staticFilesMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const fileName = req.path.substring(1); // Remove leading slash
  const filePath = path.join(process.cwd(), 'uploads', fileName);

  console.log('Static middleware - Requested file:', fileName);
  console.log('Static middleware - File path:', filePath);
  console.log('Static middleware - File exists:', fs.existsSync(filePath));

  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    const mimeType = getMimeType(path.extname(fileName));

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } else {
    next();
  }
};

// Serve individual file
export const serveFile = (req: Request, res: Response) => {
  const fileName = req.params.filename;
  const filePath = path.join(process.cwd(), 'uploads', fileName);

  console.log('ServeFile - Requested file:', fileName);
  console.log('ServeFile - File path:', filePath);
  console.log('ServeFile - File exists:', fs.existsSync(filePath));

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      message: "File not found",
      fileName,
      filePath,
      uploadsDir: path.join(process.cwd(), 'uploads'),
      uploadsExists: fs.existsSync(path.join(process.cwd(), 'uploads'))
    });
  }

  const stat = fs.statSync(filePath);
  const mimeType = getMimeType(path.extname(fileName));

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', stat.size);

  // For images, display inline; for documents, trigger download
  if (mimeType.startsWith('image/')) {
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
  } else {
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  }

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
};

// Helper function to get MIME type
function getMimeType(ext: string): string {
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };

  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}
