const lwip = require('lwip');
const Pixel = require('../models/pixel');

const imageSize = 1000;

function PaintingHandler() {
    return {
        hasImage: false,
        imageHasChanged: false,
        image: null,
        outputImage: null,
        colours: [
            {r: 255, g: 255, b: 255},
            {r: 228, g: 228, b: 228},
            {r: 136, g: 136, b: 136},
            {r: 34, g: 34, b: 34},
            {r: 255, g: 167, b: 209},
            {r: 229, g: 0, b: 0},
            {r: 229, g: 149, b: 0},
            {r: 160, g: 106, b: 66},
            {r: 229, g: 217, b: 0},
            {r: 148, g: 224, b: 68},
            {r: 2, g: 190, b: 1},
            {r: 0, g: 211, b: 221},
            {r: 0, g: 131, b: 199},
            {r: 0, g: 0, b: 234},
            {r: 207, g: 110, b: 228},
            {r: 130, g: 0, b: 128},
        ],

        getBlankImage: function() {
            return new Promise((resolve, reject) => {
                lwip.create(imageSize, imageSize, "white", function(err, image) {
                    if (err) return reject(err);
                    resolve(image);
                });
            });
        },

        loadImageFromDatabase: function() {
            return new Promise((resolve, reject) => {
                let image = this.getBlankImage().then(image => {
                    Pixel.getAllPixels().then(pixels => {
                        let batch = image.batch();
                        pixels.forEach(pixel => batch.setPixel(pixel.point.x, pixel.point.y, pixel.colour))
                        batch.exec((err, image) => {
                            if (err) return reject(err);
                            this.hasImage = true;
                            this.image = image;
                            resolve(image);
                        });
                    }).catch(err => reject(err));
                }).catch(err => {
                    reject(err);
                })
            });
        },

        getOutputImage: function() {
            return new Promise((resolve, reject) => {
                if (this.outputImage && !this.imageHasChanged) return resolve(this.outputImage);
                console.log("Generating new output image!");
                this.generateOutputImage().then((outputImage) => resolve(outputImage)).catch((err) => reject(err));
            })
        },

        generateOutputImage: function() {
            var a = this;
            return new Promise((resolve, reject) => {
                this.image.toBuffer("png", { compression: "fast", transparency: false }, function(err, buffer) {
                    if (err) return reject(err);
                    a.outputImage = buffer;
                    a.imageHasChanged = false;
                    resolve(buffer);
                })
            })
        },

        getColourRGB: function(colourID) {
            let colour = this.colours[colourID];
            if (!colour) return false;
            return colour;
        },

        doPaint: function(colour, x, y, user) {
            var a = this;
            return new Promise((resolve, reject) => {
                if(!this.hasImage) return reject({message: "Server not ready", code: "not_ready"});
                // Add to DB:
                user.addPixel(colour, x, y, function(pixel, err) {
                    if(!pixel) return reject(err);
                    // Paint on live image:
                    a.image.setPixel(x, y, colour, function(err, image) {
                        if(image) {
                            a.imageHasChanged = true;
                            a.generateOutputImage();
                        }
                    });
                    resolve();
                });
            });
        }
    }
}

PaintingHandler.prototype = Object.create(PaintingHandler.prototype);

module.exports = PaintingHandler;