import express, { Request, Response } from 'express';
import csurf from 'csurf';
import cookieParser from 'cookie-parser';
import fileUpload, { UploadedFile } from 'express-fileupload';
import slowDown from 'express-slow-down';

const api = express.Router();

// For file uploads
api.use(fileUpload());

// Slow down everything to prevent DoS attacks
const speedLimiter = slowDown({
    windowMs: 5 * 60 * 1000, // 5 minutes
    delayAfter: 50, // allow 50 requests per 5 minutes, then...
    delayMs: 500 // begin adding 500ms of delay per request above 100:
    // request # 101 is delayed by  500ms
    // request # 102 is delayed by 1000ms
    // request # 103 is delayed by 1500ms
    // etc.
});
api.use(speedLimiter);

// CSRF protection
api.use(cookieParser());
const csrf = csurf({ cookie: true });

api.post('/upload', csrf, (req: Request, res: Response) => {
    // Check if there is a file
    if (!req.files || Object.keys(req.files).length === 0)
        return res.status(400).json({ error: 'No file uploaded' });
    const file: UploadedFile = req.files.file as UploadedFile; // Kludge to prevent a compiler error
    // Check if the file is a python file
    if (file.mimetype !== 'text/x-python')
        return res.status(400).json({ error: 'Not a Python file' });
    res.status(200).json({ file: file.name });
});

export default api;