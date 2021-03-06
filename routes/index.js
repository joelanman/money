var fs 	 = require('fs');
var path = require('path');

var Promise = require("bluebird");
var express = require('express');
var router  = express.Router();
var moment  = require('moment');
var numeral = require('numeral');

var models  = require(path.join(__dirname,"..","models"));

var Account 	= models.Account;
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

			if (search.keywords.toLowerCase().indexOf("tag:") == 0){

				console.log("running tag search");

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

						console.log(term.term);
						terms.push('%' + term.term + '%');

					});

					where.title = {
						$iLike: { $any: terms }
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
					'paidIn':	(row.paidIn)  ? numeral(row.paidIn/100).format("0,0.00")  : "",
					'paidOut': 	(row.paidOut) ? numeral(row.paidOut/100).format("0,0.00") : "",
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

	var tagName = req.body.name;
	var tagId = req.body.id || false;
	var terms = req.body.terms.replace(/\r/g,'').split('\n');

	var tagTermPromises = [];

	// if an Id is sent, delete all existing tag terms

	if (tagId !== false){
		TagTerm.destroy({
			where: {
				TagId: tagId
			}
		}).then(upsertTag)
	} else {
		upsertTag();
	}

	function upsertTag(){

		// make promises for all tag terms

		terms.forEach(function(term){

			if (term.replace(/\s/g, "").length>0){

				tagTermPromises.push(
					TagTerm.create({
						term: term
					})
				);
			}

		});

		// wait for all promises to complete

		Promise
			.all(tagTermPromises)
			.bind({})
			.then(function(tagTerms){

				this.tagTerms = tagTerms;

				return Tag.upsert({
					
					name: tagName

				});

			})
			.then(function(created){

				return Tag.findOne({

					tagName: tagName

				});

			})
			.then(function(tag){

				// set tag id on the tag terms
				return tag.setTerms(this.tagTerms);

			}).then(function(){

				res.redirect("/tags");

			});
	}

});


router.get('/new-tag', function(req, res){
	res.render('tag', {tag:{"name":"","id":""}});
});

router.get('/tags/:tag', function(req, res){

	var tagName = req.params.tag;

	Tag
		.findOne({
			where: {
				name : {
					$iLike: tagName
				}
			},
			include: [{ model: TagTerm, as: "Terms" }]
		}).then(function(tag){

			if (!tag){
				res.status(404).send("Tag not found");
				return;
			}

			tag.termsString = "";

			tag.Terms.forEach(function(term){
				tag.termsString += term.term + "\n";
			});

			tag.termsString = tag.termsString.slice(0,-1);

			res.render("tag", {tag:tag});

		});

});

router.get('/new-account', function(req, res){
	res.render('account', {account:{"name":		"",
									"number":	"",
									"sortCode":	"",
									"id":		""}});
});

router.get('/accounts/:accountName', function(req, res){

	Account
		.findOne({
			where:{
				name: req.params.accountName
			}
		})
		.then(function(account){
			if (!account){
				res.status(404).send("Account not found");
				return;
			}
			res.render("account", {account:account});
		})

});

router.get('/accounts', function(req, res){

	Account.findAll()
		.then(function(accounts){
			res.render("accounts", {accounts:accounts});
		})

});

router.post('/accounts', function(req, res){

	var account = {
		name:     req.body.name,
		number:   req.body.number,
		sortCode: req.body.sortCode
	};

	if (req.body.id){
		account.id = req.body.id;
	}

	Account
		.upsert(account)
		.then(function(){
			res.redirect("/accounts");
		})

});

module.exports = router;
