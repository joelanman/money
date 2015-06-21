var fs = require('fs');
var path = require('path');

var Promise = require("bluebird");
var express = require('express');
var router = express.Router();
var moment = require('moment');
var numeral = require('numeral');

var models = require(path.join(__dirname,"..","models"));

var Transaction = models.Transaction;
var Tag = models.Tag;
var TagTerm = models.TagTerm;

router.get('/', function(req, res, next) {

	var keywords = req.query.keywords || "";

	Transaction.findAll({
		where:{
			title:{
				$iLike: '%'+keywords+'%'
			}
		}
	}).then(function(results){

		var statements = [];
		var totalPaidIn = 0;
		var totalPaidOut = 0;

		results.forEach(function(row, index, array){
			statements.push({
				'title':	row.title,
				'date':		moment(row.date).format("DD MM YYYY"),
				'paidIn':	numeral(row.paidIn/100).format("0,0.00"),
				'paidOut': 	numeral(row.paidOut/100).format("0,0.00"),
				'type': 	row.type
			});
			totalPaidIn += row.paidIn;
			totalPaidOut += row.paidOut;
		});

		res.render('index', {
			keywords: keywords,
			statements: 	statements,
			totalPaidIn: 	numeral(totalPaidIn/100).format("0,0.00"),
			totalPaidOut: 	numeral(totalPaidOut/100).format("0,0.00")
		});

	});

});

router.post('/tags', function(req, res){

	var terms = req.body.terms.split('\n');
	var tagTerms = [];

	terms.forEach(function(term){

		tagTermPromises.push(
			TagTerm.create({
				term: term
			})
		);

	});

	Promise.all(tagTermPromises)
		   .then(function(tagTerms){

		Tag.create({
			
			name: req.body.name

		}).then(function(tag){

			tag.setTerms(tagTerms).then(function(){

				res.redirect("/");

			});

		});

	})

});

module.exports = router;
