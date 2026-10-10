import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { config } from '../config.js';
import { badRequest } from './errors.js';

export const uploadRoot = path.resolve(config.uploadDir);

const ALLOWED = /^(image\/(jpeg|png|webp|gif|heic|heif|avif)|video\/(mp4|quicktime|webm))$/;
const EXT: Record<string, string> = {
  'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/heic': '.heic',
  'image/heif': '.heif', 'image/avif': '.avif', 'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm',
};

/** Disk upload scoped to the shop's folder: uploads/<shopId>/<random>.<ext> */
export const mediaUpload = multer({
  storage: multer.diskStorage({
    destination(req, _file, cb) {
      const dir = path.join(uploadRoot, String(req.auth?.shopId ?? 'public'));
      fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
    },
    filename(_req, file, cb) {
      cb(null, `${nanoid(16)}${EXT[file.mimetype] ?? ''}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (ALLOWED.test(file.mimetype)) cb(null, true);
    else cb(badRequest('Only images (jpg, png, webp, gif, heic, avif) and videos (mp4, mov, webm) are allowed'));
  },
});

const DOC_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

/** Documents: PDFs, office files, text and images (SVG/HTML deliberately excluded — they could carry scripts). */
export const documentUpload = multer({
  storage: multer.diskStorage({
    destination(req, _file, cb) {
      const dir = path.join(uploadRoot, String(req.auth?.shopId ?? 'public'), 'documents');
      fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
    },
    filename(_req, file, cb) {
      cb(null, `${nanoid(16)}${DOC_TYPES[file.mimetype] ?? EXT[file.mimetype] ?? ''}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    if (DOC_TYPES[file.mimetype] || /^image\/(jpeg|png|webp|gif|heic|heif|avif)$/.test(file.mimetype)) cb(null, true);
    else cb(badRequest('Unsupported file type — upload a PDF, Word/Excel file, text file or image'));
  },
});

export function publicUrl(file: Express.Multer.File): string {
  const rel = path.relative(uploadRoot, file.path).split(path.sep).join('/');
  return `/uploads/${rel}`;
}

export function removeUpload(url: string): void {
  if (!url.startsWith('/uploads/')) return;
  const target = path.resolve(uploadRoot, url.slice('/uploads/'.length));
  if (!target.startsWith(uploadRoot)) return;
  fs.unlink(target, () => undefined);
}
