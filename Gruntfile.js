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
                    destPrefix: 'www'
                },
                files: {
                    // Keys are destinations (prefixed with `options.destPrefix`)
                    // Values are sources (prefixed with `options.srcPrefix`); One source per destination
                    // e.g. 'bower_components/chai/lib/chai.js' will be copied to 'test/js/libs/chai.js'
                    'js/jasmine.js': 'jasmine-core/lib/jasmine-core/jasmine.js',
                    'js/boot.js': 'jasmine-core/lib/jasmine-core/boot.js',
                    'js/jasmine-html.js': 'jasmine-core/lib/jasmine-core/jasmine-html.js',
                    'js/underscore.js': 'underscore/underscore.js',
                    'css/jasmine.css': 'jasmine-core/lib/jasmine-core/jasmine.css'
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
                    base: 'www',
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
                files: ['www/js/*.js', 'www/*.html', 'www/**/*.html', 'www/img/*', 'less/**/*.less', 'less/*.less'],
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
                    'www/css/main.css': 'less/main.less'
                }
            }
        },
        uglify: {
            options: {
                mangle: false
            },
            odataToLinqMin: {
                files: {
                    'dist/LinqToOdata.min.js': ['www/js/LinqToOdata.js']
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
                    'dist/LinqToOdata.js': ['www/js/LinqToOdata.js']
                }
            }

        }
    });

    grunt.registerTask('serve', ['bowercopy', 'uglify', 'connect:main', 'watch']);

};
