var fs = require('fs');
var path = require('path');

var Promise = require("bluebird");
var express = require('express');
var router = express.Router();
var moment = require('moment');
var numeral = require('numeral');

var models = require(path.join(__dirname,"..","models"));

var Transaction = models.Transaction;
var Tag 		= models.Tag;
var TagTerm 	= models.TagTerm;

router.get('/', function(req, res, next) {

	var search = {
		keywords: req.query.keywords || "",
		dateFrom: req.query.dateFrom,
		dateTo:	  req.query.dateTo
	}

	var where = {};

	// keywords (and tags)

	new Promise(function(resolve, reject){

		if (!search.keywords){

			resolve();
			
		} else {

			if (search.keywords.toLowerCase().indexOf("tag:") === 0){

				var tag = search.keywords.replace(/\s*tag:\s*/,"");

				Tag.findOne({
					where: {
						name : {
							$iLike: tag
						}
					},
					include: [{ model: TagTerm, as: "Terms" }]
				}).then(function(tag){

					terms = [];

					tag.Terms.forEach(function(term){
						terms.push(term.term);
					});

					console.log(terms);

					where.title = {
						$iLike: { $any: terms}
					};

					resolve();

				});

			} else {

				where.title = {
					$iLike: '%' + search.keywords + '%'
				}

				resolve();

			}
		}

	}).then(function(){

		// dates

		if (search.dateFrom && search.dateTo){
			where.date = {
					$between: [search.dateFrom, search.dateTo]
				}
		}

	}).then(function(){

		// run the query

		Transaction.findAll({
			where: where
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
				search: 		search,
				statements: 	statements,
				totalPaidIn: 	numeral(totalPaidIn/100).format("0,0.00"),
				totalPaidOut: 	numeral(totalPaidOut/100).format("0,0.00")
			});

		});
	})
});

router.get('/tags', function(req, res){

	Tag.findAll({include:[{ model: TagTerm, as: "Terms" }]})
		.then(function(tags){
			res.render("tags", {tags:tags});
		})

});

router.post('/tags', function(req, res){

	var terms = req.body.terms.split('\n');
	var tagTermPromises = [];

	// make promises for all tag terms

	terms.forEach(function(term){

		tagTermPromises.push(
			TagTerm.create({
				term: term
			})
		);

	});

	// wait for all promises to complete

	Promise
		.all(tagTermPromises)
		.bind({})
		.then(function(tagTerms){

			this.tagTerms = tagTerms;

			// create the parent tag

			return Tag.create({
				
				name: req.body.name

			})

		}).then(function(tag){

			// set tag id on the tag terms

			return tag.setTerms(this.tagTerms)

		}).then(function(){

			res.redirect("/");

		});


});

module.exports = router;
