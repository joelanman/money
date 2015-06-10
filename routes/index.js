var fs = require('fs');
var path = require('path');

var express = require('express');
var router = express.Router();
var moment = require('moment');
var numeral = require('numeral');

// var CSV = require('comma-separated-values');
// var statementsPath = path.join(__dirname, '../resources/statements.csv');
// var statementsCSV = fs.readFileSync(statementsPath, 'utf8');
// var statements = CSV.parse(statementsCSV);

var Sequelize = require('sequelize')
  , sequelize = new Sequelize('money', 'money', 'money', {
      dialect: "postgres", // or 'sqlite', 'postgres', 'mariadb'
      port:    5432, // or 5432 (for postgres)
    });

var Transaction = sequelize.define('Transaction', {
  paidIn: Sequelize.INTEGER,
  paidOut: Sequelize.INTEGER,
  date: Sequelize.DATEONLY,
  title: Sequelize.STRING,
  type: Sequelize.STRING,
  balance: Sequelize.INTEGER
}, {
  timestamps: false
});

sequelize
  .sync({ force: false })
  .then(function(err) {
    console.log('It worked!');

  //   statements.forEach(function(row, index, array){

	 //    // console.log(row);

		// 	// date,type,title,paid out,paid in,balance

		// 	Transaction.create({
		// 		paidIn: 	Number(row[4]) * 100,
		// 		paidOut: 	Number(row[3]) * 100,
		// 		date: 		row[0],
		// 		title: 		row[2],
		// 		type: 		row[1],
		// 		balance:	Number(row[5]) * 100
		// 	});

		// });

  }, function (err) { 
    console.log('An error occurred while creating the table: ', err);
  });



/* GET home page. */
router.get('/', function(req, res, next) {

	var keywords = req.query.keywords;

	Transaction.findAll({
		where:{
			title:{
				$iLike: '%'+keywords+'%'
			}
	}}).then(function(results){

		var statements = [];
		var totalPaidIn = 0;
		var totalPaidOut = 0;

		results.forEach(function(row, index, array){
			statements.push({
				'title':		row.title,
				'date':			moment(row.date).format("DD MM YYYY"),
				'paidIn':		numeral(row.paidIn/100).format("0,0.00"),
				'paidOut': 	numeral(row.paidOut/100).format("0,0.00"),
				'type': 		row.type
			});
			totalPaidIn += row.paidIn;
			totalPaidOut += row.paidOut;
		});

		res.render('index', {
			keywords: keywords,
			statements: statements,
			totalPaidIn: numeral(totalPaidIn/100).format("0,0.00"),
			totalPaidOut: numeral(totalPaidOut/100).format("0,0.00")
		});

	});

});

module.exports = router;
