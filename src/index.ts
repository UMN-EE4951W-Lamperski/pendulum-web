import express, { Request, Response } from 'express';
import path from 'path';
import { env } from 'process';

const app = express();

const port = env.PORT || 2000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views/pages'));
app.use('/public', express.static(path.join(__dirname, 'public')));


app.get('/', (req: Request, res: Response) => {
    res.render('index', {
        errors: [],
    });
});

app.get('/about', (req: Request, res: Response) => {
    res.render('about');
});

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});