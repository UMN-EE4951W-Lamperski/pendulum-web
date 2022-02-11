import express, { Request, Response } from 'express';
import csurf from 'csurf';
import cookieParser from 'cookie-parser';
import fileUpload, { UploadedFile } from 'express-fileupload';
import slowDown from 'express-slow-down';


// Slow down everything to prevent DoS attacks
const speedLimiter = slowDown({
    windowMs: 5 * 60 * 1000, // 15 minutes
    delayAfter: 50, // allow 100 requests per 5 minutes, then...
    delayMs: 500 // begin adding 500ms of delay per request above 100:
    // request # 101 is delayed by  500ms
    // request # 102 is delayed by 1000ms
    // request # 103 is delayed by 1500ms
    // etc.
});


const api = express.Router();

api.use(fileUpload());
api.use(speedLimiter);

// CSRF protection
api.use(cookieParser());
const csrf = csurf({ cookie: true });

api.post('/upload', csrf, (req: Request, res: Response) => {
    if (!req.files || Object.keys(req.files).length === 0)
        return res.status(400).json({ err: 'ENOENT' });
    // Kludge to prevent a compiler error
    const file: UploadedFile = req.files.file as UploadedFile;
    console.log(file.mimetype);
    if (file.mimetype !== 'text/x-python')
        return res.status(400).json({ err: 'EINVAL' });
    res.status(200).json({ err: null });
});

export default api;