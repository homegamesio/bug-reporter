const aws = require('aws-sdk');
const fs = require('fs');
const https = require('https');
const http = require('http');

const keyPath = '/etc/letsencrypt/live/bugs.homegames.io/privkey.pem';
const certPath = '/etc/letsencrypt/live/bugs.homegames.io/fullchain.pem';

const getReqBody = (req, cb) => {
    let _body = '';
    req.on('data', chunk => {
        _body += chunk.toString();
    });

    req.on('end', () => {
        cb && cb(_body);
    });
};

const storeRecord = (record) => {
	if (record.length > 1000) {
		console.log("Truncating record of length " + record.length);
		record = record.substring(1000);
	}

	const errString = `[${Date.now()}] ${record.toString()}\n`;
	const buf = Buffer.from(errString, 'utf-8');
	fs.appendFileSync('logfile.txt', buf);

	const fileInfo = fs.statSync('logfile.txt');
	const fileSize = fileInfo.size;
	const fileSizeMb = fileSize / (1024 * 1024);

	if (fileSizeMb > 10) {
            console.log('writing log file. size in mb: ' + fileSizeMb);

	    const s3 = new aws.S3();
	    const params = { Bucket: 'homegames', Key: 'error-logs/' + Date.now(), Body: fs.readFileSync('logfile.txt')};
	    s3.upload(params, {}, (err, data) => {
		console.log('s3 response');
		console.log(err);
		console.log(data);
		fs.writeFileSync('logfile.txt', '');
	    });
       }
}

const settings = {
	key: fs.readFileSync(keyPath),
	cert: fs.readFileSync(certPath)
};

const app = https.createServer(settings, (req, res) => {
	console.log('got req ' + req.method);
	if (req.method === 'POST') {
		res.end('ok');
		getReqBody(req, (data) => {
			storeRecord(data);
		});
	}

	res.writeHead(400);
	res.end('no');
});

app.listen(443);

const redirectApp = http.createServer((req, res) => {
	res.writeHead(301, {
		'Location': 'https://bugs.homegames.io'
	});
	res.end();
});

redirectApp.listen(80);
