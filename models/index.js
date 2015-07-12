var fs = require('fs');
var path = require('path');
var CSV = require('comma-separated-values');
var statementsPath = path.join(__dirname, '../resources/statements.csv');
var statementsCSV = fs.readFileSync(statementsPath, 'utf8');
var statements = CSV.parse(statementsCSV);

var Sequelize = require('sequelize')
  , sequelize = new Sequelize('money', 'money', 'money', {
      dialect: "postgres", // or 'sqlite', 'postgres', 'mariadb'
      port:    5432, // or 5432 (for postgres)
    });

var Account = sequelize.define('Account', {
  name:     {type: Sequelize.STRING, unique: true},
  number:   {type: Sequelize.STRING, unique: true},
  sortCode: Sequelize.STRING
}, {
  timestamps: false
});

var Transaction = sequelize.define('Transaction', {
  paidIn:  Sequelize.INTEGER,
  paidOut: Sequelize.INTEGER,
  date:    Sequelize.DATEONLY,
  title:   Sequelize.STRING,
  type:    Sequelize.STRING,
  balance: Sequelize.INTEGER
}, {
  timestamps: false
});

var Tag = sequelize.define('Tag', {
  name: {type: Sequelize.STRING, unique: true}
}, {
  timestamps: false
});

var TagTerm = sequelize.define('TagTerm', {
  term: Sequelize.STRING
}, {
  timestamps: false
});

Tag.hasMany(TagTerm, {as: 'Terms'});

module.exports = {
  Transaction: Transaction,
  Tag:         Tag,
  TagTerm:     TagTerm,
  sequelize:   sequelize,
  statements:  statements
}