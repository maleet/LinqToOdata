/*jslint node: true */
'use strict';

module.exports = function (grunt) {

    // load all grunt tasks
    require('load-grunt-tasks')(grunt);

    // Project configuration.
    grunt.initConfig({
        bowercopy: {
            options: {
                // Bower components folder will be removed afterwards
                clean: true
            },
            // Anything can be copied
            test: {
                options: {
                    destPrefix: 'src'
                },
                files: {
                    // Keys are destinations (prefixed with `options.destPrefix`)
                    // Values are sources (prefixed with `options.srcPrefix`); One source per destination
                    // e.g. 'bower_components/chai/lib/chai.js' will be copied to 'test/js/libs/chai.js'
                    'www/js/jasmine.js': 'jasmine-core/lib/jasmine-core/jasmine.js',
                    'www/js/boot.js': 'jasmine-core/lib/jasmine-core/boot.js',
                    'www/js/jasmine-html.js': 'jasmine-core/lib/jasmine-core/jasmine-html.js',
                    'www/js/underscore.js': 'underscore/underscore.js',
                    'www/css/jasmine.css': 'jasmine-core/lib/jasmine-core/jasmine.css'
                }
            }
        },
        /**
         * Runs a webserver on http://localhost:9000.
         * It will be accessible on the local network by people who know the IP.
         */
        connect: {
            main: {
                options: {
                    base: 'src/www',
                    hostname: '*',
                    port: 9999,
                    livereload: true
                }
            }
        },

        /**
         * Watch for changes to files and automatically reload the page.
         */
        watch: {
            main: {
                options: {
                    livereload: true,
                    livereloadOnError: false,
                    spawn: false
                },
                files: ['src/www/js/*.js', 'src/www/*.html', 'src/www/**/*.html', 'src/www/img/*', 'src/less/**/*.less', 'src/less/*.less'],
                tasks: ['less'] //all the tasks are run dynamically during the watch event handler
            }
        },

        /**
         * Compile LESS to CSS.
         */
        less: {
            production: {
                options: {},
                files: {
                    'www/css/main.css': 'src/less/main.less'
                }
            }
        },
        uglify: {
            options: {
                mangle: false
            },
            odataToLinqMin: {
                files: {
                    'dist/LinqToOdata.min.js': ['src/www/js/LinqToOdata.js']
                }
            },
            odataToLinq: {
                options: {
                    beautify: {
                        width: 80,
                        beautify: true
                    }
                },
                files: {
                    'dist/LinqToOdata.js': ['src/www/js/LinqToOdata.js']
                }
            }

        }
    });

    grunt.registerTask('serve', ['bowercopy', 'uglify', 'connect:main', 'watch']);

};
