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

.directive('gtInput', ['EvaluationService', function(EvaluationService) {
	return {
		link: function(scope, element, attr) {

			// Function to upload a GT file.
			element.on('change', function() {
				
				var input = element.get(0);
				var reader = new FileReader();

				if (input.files.length) {
					var textFile = input.files[0];
					reader.readAsText(textFile);

					$(reader).on('load', function(e) {
						var file = e.target.result;
						
						EvaluationService.convertGTToJSON(file);
						scope.init();
					    
					    var results;
					    var csvList = "";
					    
					    if (file && file.length) {
					        results = file.split("\n");
					        var relevanceScores = {};
					        
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
					        scope.updateUsers(0);
					    }
					});
				} else {
					alert("Please upload a file before continuing.");
				}
			});
		}
	};
}])