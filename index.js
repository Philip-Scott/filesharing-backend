const express = require("express");
const multer = require('multer');
var bodyParser = require('body-parser');
const app = express();
const fs = require('fs');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

const PORT = process.env.SHARE_PORT || 3000;
const HOSTNAME = process.env.SHARE_HOST || `http://localhost:${PORT}/`;
const MAX_FILE_SIZE = Number(process.env.SHARE_MAX_SIZE) || 50000000; // 50mb;

const uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './uploads');
    },

    filename: function (req, file, callback) {
        const fileParts = file.originalname.split(".");
        const ext = fileParts[fileParts.length - 1];

        const fileName = Buffer.from(uuid()).toString('base64').slice(0, 13);
        callback(null, fileName + "." + ext);
    }
});

const fileAuth = (req, file, cb) => {
    try {
        auth(req.body.username, req.body.password);
        cb(null, true);
    } catch (error) {
        cb(error, false);
    }
}

const upload = multer(
    {
        storage: storage,
        fileFilter: fileAuth,
        limits: {
            fileSize: MAX_FILE_SIZE
        }
    }).single('file');

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.get('/delete', function (req, res) {
    res.sendFile(__dirname + "/delete.html");
});

app.get('/uploads/:fileName', function (req, res) {
    const filePath = __dirname + "/uploads/" + req.params.fileName;
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Not found');
    }
});

app.get('/api/*', function (req, res) {
    res.redirect('/');
});

app.post('/api/delete', function (req, res) {
    try {
        auth(req.body.username, req.body.password)
    } catch (e) {
        res.status(401).send("Unauthorized");
        return;
    }

    const fileParts = req.body.file.split("/");
    const filePath = __dirname + "/uploads/" + fileParts[fileParts.length - 1];

    if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            console.log(err);
        });

        res.send("File deleted");
    } else {
        res.status(404).send('Not found');
    }
});

app.post('/api/upload', function (req, res) {
    upload(req, res, function (err) {
        if (err) {
            return res.end("Error uploading file." + err);
        }
        res.end(HOSTNAME + req.file.path);
    });
});

app.listen(PORT, function () {
    console.log("Working on port " + PORT);
});

const auth = (user, pass) => {
    if (!process.env.SHARE_USER || !process.env.SHARE_PASSWORD) {
        throw Error("USER OR PASSWORD NOT SET");
    }

    if (user != process.env.SHARE_USER || pass != process.env.SHARE_PASSWORD) {
        throw Error("INCORRECT USER AND PASSWORD");
    }
};