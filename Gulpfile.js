var gulp = require('gulp');
var sass = require('gulp-sass');
var sassdoc = require('sassdoc');
var converter = require('sass-convert');

gulp.task('sass', function(){
    gulp.src('sass/main.sass')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('static/css/'));
})

gulp.task('bootstrap-sass', function(){
    gulp.src('sass/vendor/vendor.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('static/css/'));
})

gulp.task('sass-convert', function(){
    gulp.src('sass/variables.sass')
        .pipe(converter({
            from: 'sass',
            to: 'scss',
            rename: true
        }))
        .pipe(gulp.dest('sass/vendor/'));
})

gulp.task('default', function(){
    gulp.watch('sass/**/*.sass', ['sass']);
    gulp.watch('sass/variables.sass', ['sass-convert', 'bootstrap-sass']);
})