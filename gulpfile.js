'use strict';

var gulp = require('gulp'),
    $ = require('gulp-load-plugins')(),
    browserSync = require('browser-sync'),
    reload = browserSync.reload,
    config = require('./config.json'),
    fs = require('fs'),
    runSequence = require('run-sequence');

// gulp.task('get', function() {
//     fs.readdir('./build', function(err, files) {
//         files.filter(function(file) { return file.substr(-5) === '.html'; })
//              .forEach(function(file) { console.log(file) });
//     });
// });

//gulp-svgmin
//gulp-svg2png
//gulp-data
//gulp-cssshrink

// gulp --type prod

var watch = false;
var copytext = "/*!\n* Copyrights of all used libraries are written to a file human.txt and is at the root of site\n*/\n\n";

var onError = function(err) {
    $.util.beep();
    console.log(err);
};

gulp.task('browser-sync', function() {
    browserSync.init(null, {
        server: {
            baseDir: './build'
        }
    });
});

gulp.task('proxy', function() {
    gulp.src('/')
        .pipe($.run('./srvdir '+config.glob.proxy+':./build'));
});

// Files analize
gulp.task('analize', function() {
    gulp.src('js/**/*.js')
        .pipe($.jshint())
        .pipe($.jshint.reporter());
    gulp.src("build/**/*.html")
        .pipe($.htmlhint())
        .pipe($.htmlhint.reporter());
    gulp.src('build/css/*.css')
        .pipe($.csslint())
        .pipe($.csslint.reporter());
    gulp.src('js/**/*.js')
        .pipe($.jslint());
});

// chmod
// gulp.task('chmod', function () {
//     return gulp.src('build/**/*')
//         .pipe($.chmod(644))
//         .pipe(gulp.dest('build'));
// });

gulp.task('sitemap', function () {
    gulp.src('build/**/*.html', {
        read: false
    })
    .pipe($.sitemap({
        siteUrl: config.glob.site
    }))
    .pipe(gulp.dest('build/'));
});

// Clean
gulp.task('clean', function() {
    return gulp.src(['./build/', '.sass-cache/', './.tmp', './jade/_includes/_html/'], {
            read: false
        })
        .pipe($.plumber({
            errorHandler: onError
        }))
        .pipe($.rimraf());
});

// Files
gulp.task('files', function() {
    return gulp.src(['./files/**/*', './files/**/.*', '!./files/**/.DS_Store'])
        .pipe($.plumber({
            errorHandler: onError
        }))
        .pipe(gulp.dest('build'))
        .pipe($.if(watch, reload({stream: true})));
});

// HTML
gulp.task('jade-pre', function() {
    var filterUsemin = $.filter('**/*.+(js|css)');
    return gulp.src(['jade/_includes/_*.jade'])
        .pipe($.plumber({
            errorHandler: onError
        }))
        .pipe($.jade({
            pretty: true,
        }))
        .pipe($.usemin({
            assetsDir: './',
            html: [$.if($.util.env.type === 'prod', $.htmlmin({
                collapseWhitespace: true,
                keepClosingSlash: true
            }))],
            css: [        
                //($.if(env === 'production', $.uncss(config.uncss))),
                $.autoprefixer(config.autoprefixer),
                $.if($.util.env.type === 'prod', $.csso())
            ],
            js: [$.if($.util.env.type === 'prod', $.uglify()),$.header(copytext)]
        }))
        .pipe(filterUsemin)
        .pipe(gulp.dest('build'))
        .pipe(filterUsemin.restore())
        .pipe($.filter('**/*.+(html)'))
        .pipe(gulp.dest('jade/_includes/_html'));
});
gulp.task('jade-post', function() {
    return gulp.src(['jade/**/*.jade', '!jade/**/_*'])
        .pipe($.plumber({
            errorHandler: onError
        }))
        .pipe($.jade({
            pretty: true,
            basedir: './jade'
        }))
        .pipe($.usemin({
            assetsDir: './',
            html: [$.if($.util.env.type === 'prod', $.htmlmin({
                collapseWhitespace: true,
                keepClosingSlash: true
            }))],
            css: [        
                //($.if(env === 'production', $.uncss(config.uncss))),
                $.autoprefixer(config.autoprefixer),
                $.if($.util.env.type === 'prod', $.csso())
            ],
            js: [$.if($.util.env.type === 'prod', $.uglify()),$.header(copytext)]
        }))
        .pipe(gulp.dest('build'))
        .pipe($.if(watch, reload({stream: true})));
});

// CSS
gulp.task('sass', function() {
    return gulp.src('scss/**/*.scss')
        .pipe($.plumber({
            errorHandler: onError
        }))
        .pipe($.rubySass({
            loadPath: 'bower_components/foundation/scss',
            style: 'compact',
            compass: true
        }))
        .pipe(gulp.dest('.tmp/css'));
});

// Images
gulp.task('images', function() {
    return gulp.src(['images/**/*', '!images/base64/**/*', '!images/base64'])
        .pipe($.plumber({
            errorHandler: onError
        }))
        .pipe(gulp.dest('build/images'))
        .pipe($.filter('**/*.+(jpg|jpeg|png)'))
        .pipe($.webp())
        .pipe(gulp.dest('build/images'))
        .pipe($.if(watch, reload({stream: true})));
});
gulp.task('images-gen', function() {
    return gulp.src(['images/**/*'])
        .pipe($.plumber({
            errorHandler: onError
        }))
        .pipe($.imagemin({
            optimizationLevel: 5,
            progressive: true,
            interlaced: true
        }))
        .pipe(gulp.dest('images'));
});

// Tasks
gulp.task('jade', function(callback) {
    runSequence('jade-pre',
                'jade-post',
                'sitemap',
                callback);
});

gulp.task('css', function(callback) {
    runSequence('sass',
                'jade',
                callback);
});

gulp.task('default', function(callback) {
    runSequence('clean',
                ['sass', 'images', 'files'],
                'jade',
                callback);
});

gulp.task('watch', ['default', 'browser-sync'], function() {
    gulp.watch(['scss/**/*.scss'], ['css']);
    gulp.watch(['jade/**/*.jade'], ['jade']);
    gulp.watch(['js/**/*.js'], ['jade']);
    gulp.watch(['images/**/*'], ['images']);
    watch = true;
});
