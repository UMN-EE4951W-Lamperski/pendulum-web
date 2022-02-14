import express, { Request, Response } from 'express';
import csurf from 'csurf';
import cookieParser from 'cookie-parser';
import fileUpload, { UploadedFile } from 'express-fileupload';
import rateLimit from 'express-rate-limit';
import { access, stat } from 'fs/promises';
import { quote } from 'shell-quote';
import { exec } from 'child_process';

const api = express.Router();

// For file uploads
api.use(fileUpload({
    preserveExtension: true, // Preserve file extension on upload
    safeFileNames: true, // Only allow alphanumeric characters in file names
    limits: { fileSize: 1 * 1024 * 1024 }, // Limit file size to 1MB
    useTempFiles: true, // Store files in temp instead of memory
    tempFileDir: '/tmp/', // Store files in /tmp/
    debug: false, // Log debug information
}));

// Slow down frequent requests to prevent DoS attacks
const rateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Limit each IP to 10 requests per `window` (here, per 1 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
api.use(rateLimiter);

// CSRF protection
api.use(cookieParser());
const csrf = csurf({ cookie: true });

api.use(express.json());
api.route('/upload')
    .post(csrf, (req: Request, res: Response) => {
        try {
            // Check if anything was actually uploaded
            if (!req.files || Object.keys(req.files).length === 0)
                return res.status(400).json({ error: 'No file uploaded.' });

            const file: UploadedFile = req.files.file as UploadedFile; // Kludge to prevent a compiler error, only one file gets uploaded so this should be fine

            // Check if the file is too large (see fileUpload.limits for the limit)
            if (file.truncated)
                return res.status(413).json({ error: 'File uploaded was too large.' });

            // Check if the file is a python file
            if (file.mimetype !== 'text/x-python')
                return res.status(415).json({ error: 'File uploaded was not a Python file.' });

            res.status(200).json({ file: file.name, path: file.tempFilePath, csrf: req.csrfToken() });
        } catch (err) {
            // Generic error handler
            res.status(500).json({ error: 'An unknown error occurred while uploading the file.', error_msg: err });
        }
    })
    // Fallback
    .all(csrf, (req: Request, res: Response) => {
        res.set('Allow', 'POST');
        res.status(405).json({ error: 'Method not allowed.' });
    });

/* 
    This route is probably a complete security hole. It allows anyone with a login cookie access to run arbitrary Python code on the server.

    Minimizing PE vectors like running this as a low privilege user is a must.
*/
api.route('/actuate')
    .post(csrf, async (req: Request, res: Response) => {
        // Make sure the file being requested to run exists
        try {
            await access(req.body.path);
        } catch (err) {
            return res.status(403).json({ error: 'File is not accessible.' });
        }


        const stats = await stat(req.body.path);
        // Make sure the file being requested to run is a regular file
        if (!stats.isFile())
            return res.status(403).json({ error: 'File is not a regular file.' });
        // Make sure the file being requested to run is not a directory
        if (stats.isDirectory())
            return res.status(403).json({ error: 'File is a directory.' });

        const escaped = quote([ 'python', req.body.path]);
        // Run the code
        /*
            TODO: MAKE THIS MORE SECURE
            Execing random things is probably a bad idea, and snyk is complaining that it isn't escaped properly.
        */
            exec(escaped, (err, stdout, stderr) => {
            if (err)
                return res.status(500).json({ error: 'An unknown error occurred while executing the file.', error_msg: stderr });

            // Return the output
            res.status(200).json({ output: stdout });
        });
    })
    // Fallback
    .all(csrf, (req: Request, res: Response) => {
        res.set('Allow', 'POST');
        res.status(405).json({ error: 'Method not allowed.' });
    });


export default api;