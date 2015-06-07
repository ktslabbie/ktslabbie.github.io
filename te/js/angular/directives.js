var twitterDirectives = angular.module('twitterWeb.directives', [])

.directive('gtButton', ['EvaluationService', function(EvaluationService) {
	return {
		link: function(scope, element, attr) {
			var gtFileInput = $('#gtfile');
			
			// Function to upload a GT file.
			element.on('click', function() {
				if (!window.FileReader) {
					alert("Your browser is not supported.");
					return false;
				}
				
				gtFileInput.click();
			});
		}
	};
}])

.directive('firstVisit', function() {
    return {
        link: function(scope, element, attr) {
            var firstVisit = (localStorage.firstVisit || 1);

            if(firstVisit == 1) {
                element.modal('show');
                localStorage.firstVisit = 0;
            }
        }
    };
})

.directive('demoButton', function() {
	return {
		link: function(scope, element, attr) {
			element.on('click', function() {
				scope.init();
				scope.generalityBias = 0.8;
				scope.users = _.map(DEMO_SET, function(s){ return { screenName: s }; });
				scope.updateUsers(0);
			});
		}
	};
})

.directive('gtInput', ['EvaluationService', '$timeout', function(EvaluationService, $timeout) {
	return {
		link: function(scope, element, attr) {
			// Function to upload a GT file.
			element.on('change', function() {
				
				var input = element.get(0);
				

				if (input.files.length == 1) {
					var reader = new FileReader();
					var textFile = input.files[0];
					reader.readAsText(textFile);

					$(reader).on('load', function(e) {
						var file = e.target.result;

						EvaluationService.convertGTToJSON(file);
						//scope.init();

						var results;
						var csvList = "";

						if (file && file.length) {
							results = file.split("\n");
							var relevanceScores = {};
							var screenNames = [];

							_.each(results, function(result) {
								result = result.trim();
								if(result === "") return;
								if(result.charAt(0) != ":" && result.charAt(0) != "-") {
									var res = result.split(",");
									scope.users.push( { screenName: res[0] } );
									relevanceScores[res[0]] = res[1];
								}
							});

							EvaluationService.setRelevanceScores(relevanceScores);

							//if(scope.evaluationMode)
								//scope.optimization(0.000, 0.00, 6, 0);
							//else
							
							//scope.updateUsers(0);
							scope.kmeansSuite(2);
						}
					});

				} else if (input.files.length == 2) {
					var reader = new FileReader();
					var gtFile = input.files[0];
					reader.readAsText(gtFile);
					scope.groups = [];
					var topics = parseInt(input.files[1].name.split("-")[1]);
					while(topics--) {
						scope.groups.push({ users: [] });
					}
					
					console.log(scope.groups.length + " groups generated!");

					$(reader).on('load', function(e) {
						var file = e.target.result;

						//console.log("gt file? " + file);


						EvaluationService.convertDocumentsToGT(file.split("\n"));

						var results;
						var csvList = "";

						if (file && file.length) {
							results = file.split("\n");
							var relevanceScores = {};
							var screenNames = [];

							_.each(results, function(result) {
								result = result.trim();
								if(result === "") return;
								if(result.charAt(0) != ":" && result.charAt(0) != "-") {
									var res = result.split(",");
									relevanceScores[res[0]] = res[1];
								}
							});

							EvaluationService.setRelevanceScores(relevanceScores);
						}
					});

					$timeout(function() {

						var ldaReader = new FileReader();
						var ldaFile = input.files[1];
						ldaReader.readAsText(ldaFile);

						$(ldaReader).on('load', function(e) {
							var file = e.target.result;

							var results;
							var csvList = "";

							if (file && file.length) {
								results = file.split("\n");
								results.splice(0,1);
								var screenNames = [];

								_.each(results, function(result) {
									result = result.trim();
									if(result === "") return;

									var res = result.split("\t");
									var parts = res[1].split("/");
									//var nm = parts[9].split("\.");
									var nm = parts[9];

									scope.users.push( { screenName: nm } );

									//if(parseFloat(res[3]) > 0.0) {
										scope.groups[parseInt(res[2])].users.push({ screenName: nm });
									//}

								});

								EvaluationService.clusterEvaluation(scope.groups, scope.users.length, "main");
							}
						});
					}, 1000);

				} else if (input.files.length > 2) {

					EvaluationService.convertDocumentsToGT(input.files);
					
					// Document mode with multiple files.
					for (var i = 0; i < input.files.length; i++) {
					    (function(file) {
					        var name = file.name;
					        var reader = new FileReader();  
					        
					        reader.onload = function(e) { 
					            // get file content  
					            var text = e.target.result;

					            var start = text.indexOf("Lines:");
					            text = text.substring(start + 10);
					            
					            //replace(/\\r\\n/g, " ")
					            scope.updateDocument({ screenName: name  }, text);
					        }
					        
					        reader.readAsText(file, "UTF-8");
					        
					    })(input.files[i]);
					}
					
					$timeout(function() {
						//scope.kmeansSuite(2);
						scope.$broadcast('userUpdated');
					}, 15000);
					
				} else {
					alert("Please upload a file before continuing.");
				}
			});
		}
	};
}])