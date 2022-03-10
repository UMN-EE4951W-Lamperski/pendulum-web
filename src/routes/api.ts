import { spawn } from 'child_process';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import express, { Request, Response } from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import { access, stat } from 'fs/promises';
import { quote } from 'shell-quote';

const api = express.Router();

// Use JSON parser for API requests and responses
api.use(express.json());
// CSRF protection
api.use(cookieParser());
const csrf = csurf({ cookie: true });

// For file uploads
api.use(
  fileUpload({
    preserveExtension: true, // Preserve file extension on upload
    safeFileNames: true, // Only allow alphanumeric characters in file names
    limits: { fileSize: 1 * 1024 * 1024 }, // Limit file size to 1MB
    useTempFiles: true, // Store files in temp instead of memory
    tempFileDir: '/tmp/', // Store files in /tmp/
    debug: false, // Log debug information
  })
);

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
        415 when the file's MIME type is not text/x-python or text/plain (WINDOWS WHY)
        500 for any other errors
*/
api
  .route('/upload')
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
      if (file.mimetype !== 'text/x-python' && file.mimetype !== 'text/plain')
        return res
          .status(415)
          .json({ error: 'File uploaded was not a Python file.' });

      res.status(201).json({
        file: { file: file.name, path: file.tempFilePath },
        msg: 'File uploaded successfully.',
        csrf: req.csrfToken(),
      });
    } catch (err) {
      // Generic error handler
      res.status(500).json({
        error: 'An unknown error occurred while uploading the file.',
        error_msg: err,
      });
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
        file: {
            name: The name of the file to run, currently unused
            path: The path to the uploaded file on the server, passed in from /api/v1/upload on the website
        }
    Returns:
        200:
            {
                "file": {
                    "name": "file.py",
                    "filename": "file-538126",
                }
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
api
  .route('/actuate')
  // Snyk error mitigation, should be fine since the rate limiting is already in place
  // file deepcode ignore NoRateLimitingForExpensiveWebOperation: This is already rate limited by the website, so we don't need to do it again
  .post(csrf, async (req: Request, res: Response) => {
    try {
      const path: string = req.body.file.path;
      // Verify that the file exists and is a regular file
      // Return if not since the res will be sent by the verifyFile function
      if ((await verifyFile(path, res)) !== true) return;

      const escaped = quote([path]);
      // Run the code
      /*
            TODO:
            - Potentially add the limiter to one-per-person here
            - Add a timeout
                - Communicate to the machine to give up (the user as well), maybe just kill the process?
            - Make this more secure
                - HOW?
        */
      // let output = '';
      let stderr = '';
      const actuation = spawn('python', escaped.split(' '));
      // actuation.stdout.on('data', (data: Buffer) => {
      //     output += data.toString();
      // });
      actuation.stderr.on('data', (data: Buffer) => {
        stderr += `STDERR: ${data.toString()}`;
      });
      actuation.on('close', (code: number) => {
        const filename: string = (req.body.file.path as string)
          .split('/')
          .pop() as string;
        // Make sure the program exited with a code of 0 (success)
        if (code !== 0)
          return res.status(500).json({
            error: `Program exited with exit code ${code}`,
            error_msg: stderr,
            file: { name: req.body.file.file, filename: filename },
          });
        return res
          .status(200)
          .json({ file: { name: req.body.file.file, filename: filename } });
      });
      // Kill the process if it takes too long
      // Default timeout is 120 seconds (2 minutes)
      setTimeout(() => {
        actuation.kill();
      }, 120000);
    } catch (err) {
      // Generic error handler
      return res.status(500).json({
        error: 'An unknown error occurred while running the file.',
        error_msg: err,
      });
    }
  })
  // Fallback
  .all(csrf, (req: Request, res: Response) => {
    res.set('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  });

/*
    Download the CSV file after running the pendulum
    GET /api/v1/download
    Parameters:
        filename: The name of the file to download
    Returns:
        200: (the CSV file)
        403 when someone is trying to do directory traversal
        404 when the file is not accessible or does not exist
        500 for any other errors
*/
api
  .route('/download')
  .get(csrf, async (req: Request, res: Response) => {
    const filename: string = req.query.filename as string;
    if (!filename)
      return res.status(400).json({ error: 'No filename specified.' });
    // Make sure no path traversal is attempted
    // This regex matches all alphanumeric characters, underscores, and dashes.
    // MAKE SURE THIS DOES NOT ALLOW PATH TRAVERSAL
    if (!/^[\w-]+$/.test(filename))
      return res.status(403).json({ error: 'No.' });

    const path = `/tmp/${filename}.csv`;

    // Verify that the file exists and is a regular file
    // Return if not since the res will be sent by the verifyFile function
    if ((await verifyFile(path, res)) !== true) return;
    // Read the file and send it to the client
    res.type('text/csv');
    // Snyk error mitigation, should be fine since tmp is private and the simple regex above should prevent path traversal
    // deepcode ignore PT: This is probably mitigated by the regex
    return res.sendFile(path);
  })
  // Fallback
  .all(csrf, (req: Request, res: Response) => {
    res.set('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  });

/*
    Verify that the file exists and is a regular file
    Parameters:
        path: The path to the file on the server
        res: The response object to send the unsuccessful response to
    Returns:
        true: The file exists and is a regular file
        false: The file does not exist or is not a regular file
        ** AFTER THIS POINT, THE API HAS ALREADY SENT A RESPONSE, SO THE FUNCTION THAT CALLED IT SHOULD NOT RETURN ANOTHER RESPONSE **
*/
async function verifyFile(file: string, res: Response) {
  // Make sure the file being requested to run exists
  try {
    await access(file);
  } catch (err) {
    res
      .status(404)
      .json({ error: 'File is not accessible or does not exist.' });
    return false;
  }
  // This is a try catch because otherwise type checking will fail and get all messed up
  // Handle your promise rejections, kids
  try {
    const stats = await stat(file);
    // Make sure the file being requested to run is a regular file
    if (!stats.isFile()) {
      res.status(400).json({ error: 'File is not a regular file.' });
      return false;
    }
    // Make sure the file being requested to run is not a directory
    else if (stats.isDirectory()) {
      res.status(400).json({ error: 'File is a directory.' });
      return false;
    }

    // File does exist and is a regular file, so it is good to go
    return true;
  } catch (err) {
    res
      .status(404)
      .json({ error: 'File is not accessible or does not exist.' });
    return false;
  }
}

export default api;
