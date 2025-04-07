var express = require('express');
var multer = require('multer');
var router = express.Router();


var storage = multer.memoryStorage();
var upload = multer({ storage: storage });


router.get('/', function(req, res, next) {
  res.render('home', { title: 'Home' });
});


router.post('/upload', upload.single('audio'), function(req, res, next) {

    if (!req.file) {
        console.log("No ha llegado")
        return res.status(400).json({ message: 'No se ha recibido ningún archivo' });
    }

    console.log('Archivo recibido:', req.file);  

    res.json({ message: 'Archivo recibido con éxito' });
});

module.exports = router;
