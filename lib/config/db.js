// Copyright 2017, Venkat Peri.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

const Sequelize = require( 'sequelize' );
const path = require( 'path' );
const fs = require( 'fs' );
const debug = require( 'debug' );

const dbFile = path.join( process.env.HOME, ".wp-asciidoc.db" );

const db = {
  logger : debug( 'sequelize' )
};

const sequelize = new Sequelize( undefined, undefined, undefined, {
  dialect : 'sqlite',
  storage : dbFile,
  define : {
    underscored : true,
    //prevent sequelize from pluralizing table names
    freezeTableName : true,
  },
  logging : db.logger
} );

db.Sequelize = Sequelize;
db.sequelize = sequelize;

//Models/tables
db.posts = require( '../model/post' )( sequelize, Sequelize );
db.blogs = require( '../model/blog' )( sequelize, Sequelize );

//Relations
db.posts.belongsTo( db.blogs );
db.blogs.hasMany( db.posts );

module.exports = db;