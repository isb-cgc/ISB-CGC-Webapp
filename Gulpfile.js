var gulp = require('gulp');
var sass = require('gulp-sass');
var sassdoc = require('sassdoc');
var converter = require('sass-convert');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('sass', function(){
    gulp.src('blink_sass/style.sass')
        .pipe(sass().on('error', sass.logError))
        .pipe(sourcemaps.init())
        .pipe(autoprefixer())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('static/css/'));
})

gulp.task('bootstrap-sass', function(){
    gulp.src('blink_sass/vendor/vendor.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('static/css/'));
})

gulp.task('sass-convert', function(){
    gulp.src('blink_sass/variables.sass')
        .pipe(converter({
            from: 'sass',
            to: 'scss',
            rename: true
        }))
        .pipe(gulp.dest('blink_sass/vendor/'));
})

gulp.task('default', function(){
    gulp.watch('blink_sass/**/*.sass', ['sass']);
    gulp.watch(['blink_sass/variables.sass', 'blink_sass/**/*.scss'], ['sass-convert', 'bootstrap-sass']);
})