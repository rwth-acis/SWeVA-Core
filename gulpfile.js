/*
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

'use strict';

// Include Gulp & tools we'll use
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');
var source = require('vinyl-source-stream');
var reload = browserSync.reload;
var browserify = require('browserify');
var merge = require('merge-stream');
var path = require('path');
var fs = require('fs');
var historyApiFallback = require('connect-history-api-fallback');







// Lint JavaScript
gulp.task('jshint', function () {
    return gulp.src([
        'app/**/*.js',
        'app/**/*.html',
        'gulpfile.js'
    ])
      .pipe(reload({ stream: true, once: true }))
      .pipe($.jshint.extract()) // Extract JS from .html files
      .pipe($.jshint())
      .pipe($.jshint.reporter('jshint-stylish'))
      .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});

gulp.task('browserify', function () {

   
    return browserify({
        entries: [
            './app/core/core.js'
        ]
    })
    .bundle()
    .pipe(source('core.build.js'))
    .pipe(gulp.dest('./app/'))
    ;//.pipe(reload({ stream: true, once: true }));


    
});



// Copy all files at the root level (app)
gulp.task('copy', function () {
    var app = gulp.src([
      'app/*',
      '!app/test',
      '!app/cache-config.json'
    ], {
        dot: true
    }).pipe(gulp.dest('dist'));

    var bower = gulp.src([
      'bower_components/**/*'
    ]).pipe(gulp.dest('dist/bower_components'));


    return merge(app, bower)
      .pipe($.size({ title: 'copy' }));
});

// Clean output directory
gulp.task('clean', function (cb) {
    del(['.tmp', 'dist'], cb);
});

// Watch files for changes & reload
gulp.task('serve', [], function () {
    browserSync({
        port: 5001,
        notify: false,
        logPrefix: 'SWeVA',
        snippetOptions: {
            rule: {
                match: '<span id="browser-sync-binding"></span>',
                fn: function (snippet) {
                    return snippet;
                }
            }
        },
        // Run as an https by uncommenting 'https: true'
        // Note: this uses an unsigned certificate which on first access
        //       will present a certificate warning in the browser.
        // https: true,
        server: {
            baseDir: ['.tmp', 'app'],
            middleware: [historyApiFallback()],
            routes: {
                '/bower_components': 'bower_components'
            }
        }
    });

    gulp.watch(['app/**/*.html'], reload);  
    gulp.watch(['app/**/*.js'], ['browserify']);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['default'], function () {
    browserSync({
        port: 5001,
        notify: false,
        logPrefix: 'SWeVA',
        snippetOptions: {
            rule: {
                match: '<span id="browser-sync-binding"></span>',
                fn: function (snippet) {
                    return snippet;
                }
            }
        },
        // Run as an https by uncommenting 'https: true'
        // Note: this uses an unsigned certificate which on first access
        //       will present a certificate warning in the browser.
        // https: true,
        server: 'dist',
        middleware: [historyApiFallback()]
    });
});

// Build production files, the default task
gulp.task('default', ['clean'], function (cb) {
    // Uncomment 'cache-config' after 'rename-index' if you are going to use service workers.
    runSequence(
      ['copy', 'styles'],
      'elements',
      ['jshint', 'images', 'fonts', 'html'],
      'vulcanize', 'rename-index', // 'cache-config',
      cb);
});

