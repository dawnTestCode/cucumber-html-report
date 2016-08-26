'use strict';

var replace   = require("replace");
var Directory = require("../lib/directory.js");
var fs        = require("fs");

function templateBuilder(report) {

    this.report = report || undefined;
    this.template = './' + this.report.options.template  || './extended_template.html';

    this.checkOptions = function(options) {
        console.log(options);
        // Make sure we have input file!
        if (!fs.existsSync(options.source) || typeof options.source === 'undefined'){
            console.error("Input file " + options.source + " does not exist! Aborting");
            return "Source error";
        }
        // Make sure we have template file!
        if (!options.hasOwnProperty('template') || (options.hasOwnProperty('template') && !fs.existsSync(options.template))){
            console.error("Template file " + options.template + " does not exist! Aborting");
            return "Template error";
        }
        // Create output directory if not exists
        if (!fs.existsSync(options.dest)) {
            Directory.mkdirpSync(options.dest);
            console.log("Created directory: %s", options.dest);
            return "Directory error";
        }
        // Make sure we have a name defined
        if (typeof options.name === 'undefined'){
            console.error("Template name " + options.name + " does not valid! Aborting");
            return "File name error";
        }
        return true;
    }

    this.renderTemplate = function() {
        var self = this;
        return new Promise(function (resolve, reject) {
            fs.readFile('./src/grid.html', 'utf8', function (err,data) {
                if (err) {
                    reject('Error reading grid');
                } else if(self.checkOptions(self.report.options) !== true) {
                    reject(self.checkOptions(self.report.options));
                } else {
                    fs.writeFile(self.template, data, 'utf8', function (err,data) {
                        if (err) reject('Error writing destination');

                        Promise.all([self.parseCss(), self.parseHtml(), self.parseJS()]).then(function(res){
                            self.createReport(self.report);
                            resolve('Promise success');
                        }, function(err){
                            reject('Promise all error');
                        });
                    });
                }
            });
        });
    }

    this.parseCss = function() {
        var self = this;
        return new Promise(function (resolve, reject) {
            fs.readFile('./src/styles.css', 'utf8', function (err,data) {
                if (err) reject('Css parse failed');

                replace({
                    regex: '{{cssData}}',
                    replacement: data,
                    paths: [self.template],
                    recursive: true,
                    silent: true,
                });

                resolve(data);
            });
        });
    }

    this.parseHtml = function() {
        var self = this;
        return new Promise(function (resolve, reject) {
            fs.readFile('./src/template.html', 'utf8', function (err,data) {   
                if (err) reject('HTML parse failerd');

                replace({
                    regex: '<main></main>',
                    replacement: data,
                    paths: [self.template],
                    recursive: true,
                    silent: true,
                });

                resolve(data);
            });
        });
    }

    this.parseJS = function() {
        var self = this;
        return new Promise(function (resolve, reject) {

            var jsData = '';
            var readStream = fs.createReadStream('./app.js');

            readStream
                .on('data', function (chunk) {
                    jsData += chunk;
                })
                .on('end', function () {

                    replace({
                        regex: '{{jsData}}',
                        replacement: jsData,
                        paths: [self.template],
                        recursive: false,
                        silent: true,
                    });

                    resolve(jsData);
                })
                .on('error', function(err){
                    reject('JS parse failed');
                });
        });
    }

    this.createReport = function(report) {
        if(typeof report !== 'undefined') {
            report.createReport();
        }
    }

}


module.exports = templateBuilder;