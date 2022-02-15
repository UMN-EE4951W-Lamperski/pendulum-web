import express, { Request, Response } from 'express';
// Middleware for security
import csurf from 'csurf';
import cookieParser from 'cookie-parser';
import fileUpload, { UploadedFile } from 'express-fileupload';
// For executing the python scripts
import { access, stat } from 'fs/promises';
import { Stats } from 'fs';
import { quote } from 'shell-quote';
import { spawn } from 'child_process';

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

// CSRF protection
api.use(cookieParser());
const csrf = csurf({ cookie: true });

// Use JSON parser for API requests and responses
api.use(express.json());

/*
    Upload a file to the server
    POST /api/v1/upload
    Parameters:
        files: The file to upload
    Returns:
        201:
            {
                "message": "File uploaded successfully",
                "file": {
                    "name": "file.py",
                    "path": "/tmp/file-538126",
                }
            }
        400 when there is no file
        413 when the file is too large
        415 when the file's MIME type is not text/x-python
        500 for any other errors
*/
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

            res.status(201).json({ file: file.name, path: file.tempFilePath, msg: 'File uploaded successfully.', csrf: req.csrfToken() });
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
    Actuate the pendulum
    POST /api/v1/actuate
    Parameters:
        name: The name of the file to run, currently unused
        path: The path to the uploaded file on the server, passed in from /api/v1/upload on the website
    Returns:
        200:
            {
                "stdout": "Hello from Python!\n",
            }
        400 for when the file passed in is not a regular file
        403 when the file is not accessible
        500:
            {
                "error": "Program exited with error code 1.",
                "error_msg": "NameError: name 'sleep' is not defined",
            }
    
    This route is probably a complete security nightmare. It allows anyone to run arbitrary Python code on the server.

    Minimizing PE vectors like running this as an extremely low privilege user is a must.

*/
api.route('/actuate')
    // file deepcode ignore NoRateLimitingForExpensiveWebOperation: This is already rate limited by the website, so we don't need to do it again
    .post(csrf, async (req: Request, res: Response) => {
        // Make sure the file being requested to run exists
        try {
            await access(req.body.path);
        } catch (err) {
            return res.status(403).json({ error: 'File is not accessible or does not exist.' });
        }


        const stats: Stats = await stat(req.body.path);
        // Make sure the file being requested to run is a regular file
        if (!stats.isFile())
            return res.status(400).json({ error: 'File is not a regular file.' });
        // Make sure the file being requested to run is not a directory
        if (stats.isDirectory())
            return res.status(400).json({ error: 'File is a directory.' });

        const escaped = quote( [ req.body.path ] );
        // Run the code
        /*
            TODO:
            - Potentially add the limiter to one-per-person here
            - Add a timeout
                - Communicate to the machine to give up (the user as well), maybe just kill the process?
            - Make this more secure
                - HOW?
        */
        let output = '';
        const actuation = spawn('python', escaped.split(' '));
        actuation.stdout.on('data', (data: Buffer) => {
            output += data.toString();
        });
        actuation.stderr.on('data', (data: Buffer) => {
            output += `STDERR: ${data.toString()}`;
        });
        actuation.on('close', (code: number) => {
            if (code !== 0)
                res.status(500).json({ error: `Program exited with exit code ${code}`, error_msg: output });
            res.status(200).json({ stdout: output });
        });
    })
    // Fallback
    .all(csrf, (req: Request, res: Response) => {
        res.set('Allow', 'POST');
        res.status(405).json({ error: 'Method not allowed.' });
    });


export default api;